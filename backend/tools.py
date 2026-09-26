"""Read-only product and inventory tools for the Campus Customs agent."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from pydantic_ai import RunContext

if __package__:
    from .audit import append_audit_event, safe_audit_text
    from .models import AgentDependencies, ProductCard, StockSize
else:
    from audit import append_audit_event, safe_audit_text
    from models import AgentDependencies, ProductCard, StockSize


def _connect(database_path: Path) -> sqlite3.Connection:
    if not database_path.is_file():
        raise FileNotFoundError("The Campus Customs database is missing.")
    connection = sqlite3.connect(f"{database_path.resolve().as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def _parse_array(value: str | None) -> list[Any]:
    try:
        parsed = json.loads(value or "[]")
    except (TypeError, json.JSONDecodeError):
        return []
    return parsed if isinstance(parsed, list) else []


def _size_sort_key(size: str) -> tuple[int, str]:
    order = {"XXS": 0, "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "XXL": 6, "2XL": 6, "3XL": 7}
    return order.get(size.upper(), 50), size


def _query_variants(query: str) -> list[str]:
    """Include a common singular form when a one-word category is pluralized."""
    cleaned_query = query.strip()
    variants = [cleaned_query]
    if any(character.isspace() for character in cleaned_query):
        return variants

    lowered = cleaned_query.lower()
    if lowered.endswith("ies") and len(cleaned_query) > 4:
        variants.extend((cleaned_query[:-1], cleaned_query[:-3] + "y"))
    elif lowered.endswith("s") and not lowered.endswith("ss") and len(cleaned_query) > 3:
        variants.append(cleaned_query[:-1])
    return list(dict.fromkeys(variant for variant in variants if variant))


def _load_product(connection: sqlite3.Connection, product_id: str) -> ProductCard | None:
    row = connection.execute(
        "SELECT * FROM catalogue WHERE product_id = ?",
        (product_id,),
    ).fetchone()
    if row is None:
        return None

    inventory_rows = connection.execute(
        "SELECT size, quantity FROM inventory WHERE product_id = ?",
        (product_id,),
    ).fetchall()
    inventory = [
        StockSize(size=item["size"], quantity=item["quantity"])
        for item in sorted(inventory_rows, key=lambda item: _size_sort_key(item["size"]))
    ]
    return ProductCard(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        price=row["price"],
        image_url=f"/images/{Path(row['image_file_path']).name}",
        colors=_parse_array(row["colors"]),
        inventory=inventory,
        total_stock=sum(item.quantity for item in inventory),
    )


def _audit_tool_event(
    ctx: RunContext[AgentDependencies],
    *,
    event: str,
    tool_name: str,
    arguments: dict[str, Any],
    result: dict[str, Any] | None = None,
    stop_reason: str | None = None,
) -> None:
    if ctx.deps.audit_run_id is None:
        return
    append_audit_event(
        run_id=ctx.deps.audit_run_id,
        event=event,
        tool_name=tool_name,
        arguments=arguments,
        result=result,
        stop_reason=stop_reason,
    )


def _product_search_summary(products: list[ProductCard]) -> dict[str, Any]:
    return {
        "count": len(products),
        "product_ids": [product.product_id for product in products],
    }


def search_products(
    ctx: RunContext[AgentDependencies],
    query: str,
    limit: int = 8,
) -> list[ProductCard]:
    """Search the live product catalog by name, garment, description, color, or tag."""
    cleaned_query = query.strip()
    bounded_limit = min(max(limit, 1), 8)
    arguments = {"query": safe_audit_text(cleaned_query), "limit": bounded_limit}
    _audit_tool_event(
        ctx,
        event="tool_call_started",
        tool_name="search_products",
        arguments=arguments,
        result={"status": "started"},
    )
    try:
        if not cleaned_query:
            products = []
        else:
            variants = _query_variants(cleaned_query)
            search_columns = ("name", "garment_type", "description", "colors", "search_tags")
            pattern_parameters = [f"%{variant}%" for variant in variants for _ in search_columns]
            connection = _connect(ctx.deps.database_path)
            try:
                conditions = " OR ".join(
                    f"{column} LIKE ? COLLATE NOCASE"
                    for _variant in variants
                    for column in search_columns
                )
                rows = connection.execute(
                    f"""
                    SELECT product_id
                    FROM catalogue
                    WHERE {conditions}
                    ORDER BY name COLLATE NOCASE
                    LIMIT ?
                    """,
                    (*pattern_parameters, bounded_limit),
                ).fetchall()
                found = [_load_product(connection, row["product_id"]) for row in rows]
                products = [product for product in found if product is not None]
            finally:
                connection.close()
        _audit_tool_event(
            ctx,
            event="tool_call_completed",
            tool_name="search_products",
            arguments=arguments,
            result=_product_search_summary(products),
            stop_reason="tool_returned",
        )
        return products
    except Exception as error:
        _audit_tool_event(
            ctx,
            event="tool_call_failed",
            tool_name="search_products",
            arguments=arguments,
            result={"error_type": type(error).__name__},
            stop_reason="tool_error",
        )
        raise


def get_product_details(
    ctx: RunContext[AgentDependencies],
    product_id: str,
) -> ProductCard | None:
    """Get one catalog product and its current inventory by its exact product ID."""
    arguments = {"product_id": safe_audit_text(product_id, max_length=120)}
    _audit_tool_event(
        ctx,
        event="tool_call_started",
        tool_name="get_product_details",
        arguments=arguments,
        result={"status": "started"},
    )
    try:
        connection = _connect(ctx.deps.database_path)
        try:
            product = _load_product(connection, product_id)
        finally:
            connection.close()
        summary: dict[str, Any] = {"found": product is not None}
        if product is not None:
            summary.update(
                {
                    "product_id": product.product_id,
                    "price": product.price,
                    "stock_by_size": {item.size: item.quantity for item in product.inventory},
                }
            )
        _audit_tool_event(
            ctx,
            event="tool_call_completed",
            tool_name="get_product_details",
            arguments=arguments,
            result=summary,
            stop_reason="tool_returned",
        )
        return product
    except Exception as error:
        _audit_tool_event(
            ctx,
            event="tool_call_failed",
            tool_name="get_product_details",
            arguments=arguments,
            result={"error_type": type(error).__name__},
            stop_reason="tool_error",
        )
        raise
