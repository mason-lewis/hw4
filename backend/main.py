"""Catalog, account, and chat API for the Campus Customs storefront."""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator, model_validator
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart
from pwdlib import PasswordHash
from starlette.middleware.sessions import SessionMiddleware

if __package__:
    from .agent import AGENT_USAGE_LIMITS, PORTKEY_CONFIGURED, shop_agent
    from .audit import append_audit_event
    from .models import (
        AgentDependencies,
        AgentPageContext,
        AgentReply,
        CartItemRequest,
        CartLine,
        CartQuantityRequest,
        CartReply,
        ChatHistoryMessage,
        ChatHistoryReply,
        ChatPageContext,
        ChatReply,
        ChatRequest,
        ChatTurn,
        ChatUsage,
        ProductCard,
        ShopperProfile,
    )
else:
    from agent import AGENT_USAGE_LIMITS, PORTKEY_CONFIGURED, shop_agent
    from audit import append_audit_event
    from models import (
        AgentDependencies,
        AgentPageContext,
        AgentReply,
        CartItemRequest,
        CartLine,
        CartQuantityRequest,
        CartReply,
        ChatHistoryMessage,
        ChatHistoryReply,
        ChatPageContext,
        ChatReply,
        ChatRequest,
        ChatTurn,
        ChatUsage,
        ProductCard,
        ShopperProfile,
    )


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
PRODUCTS_DIR = DATA_DIR / "products"
DATABASE_PATH = Path(os.environ.get("CAMPUS_CUSTOMS_DATABASE_PATH", DATA_DIR / "campus_customs.db"))
SESSION_SECRET = os.environ.get("CAMPUS_CUSTOMS_SESSION_SECRET") or secrets.token_urlsafe(32)
COOKIE_SECURE = os.environ.get("CAMPUS_CUSTOMS_COOKIE_SECURE", "false").lower() == "true"
PASSWORD_HASHER = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash("not-a-real-account-password")
CHAT_HISTORY_LIMIT = 100
CHAT_CONTEXT_LIMIT = 10


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name is required.")
        return cleaned

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)


def normalize_email(email: EmailStr) -> str:
    return str(email).strip().lower()


def hash_password(password: str) -> str:
    # pwdlib/Argon2id generates and encodes an independent random salt per password.
    return PASSWORD_HASHER.hash(password)


def verify_legacy_seed_hash(password: str, stored_hash: str) -> bool:
    """Verify the seed's old PBKDF2 encoding before upgrading it on successful login."""
    parts = stored_hash.split("$")
    if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
        return False
    salt, expected = parts[1], parts[2]
    actual = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000
    ).hex()
    return hmac.compare_digest(actual, expected)


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$argon2id$"):
        try:
            return PASSWORD_HASHER.verify(password, stored_hash)
        except (ValueError, TypeError):
            return False
    return verify_legacy_seed_hash(password, stored_hash)


def public_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "first_name": row["first_name"] or row["name"].split(" ", 1)[0],
        "last_name": row["last_name"] or "",
        "email": row["email"],
    }

app = FastAPI(title="Campus Customs API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="campus_customs_session",
    max_age=60 * 60 * 24 * 7,
    same_site="lax",
    https_only=COOKIE_SECURE,
)
app.mount("/images", StaticFiles(directory=PRODUCTS_DIR), name="product-images")


@app.on_event("startup")
def ensure_cart_table() -> None:
    """Create the account cart table for existing seed databases."""
    connection = get_connection(readonly=False)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS cart_items (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL REFERENCES catalogue(product_id) ON DELETE CASCADE,
                size TEXT NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (user_id, product_id, size)
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def get_connection(readonly: bool = True) -> sqlite3.Connection:
    if not DATABASE_PATH.is_file():
        raise HTTPException(status_code=500, detail="The Campus Customs database is missing.")
    if readonly:
        connection = sqlite3.connect(f"{DATABASE_PATH.resolve().as_uri()}?mode=ro", uri=True)
    else:
        connection = sqlite3.connect(DATABASE_PATH, timeout=10)
        connection.execute("PRAGMA foreign_keys = ON")
    connection.row_factory = sqlite3.Row
    return connection


def find_user(connection: sqlite3.Connection, user_id: int) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT id, name, email, first_name, last_name FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()


def get_session_user(request: Request) -> sqlite3.Row | None:
    user_id = request.session.get("user_id")
    if not isinstance(user_id, int):
        return None
    connection = get_connection()
    try:
        row = find_user(connection, user_id)
        if row is None:
            request.session.clear()
        return row
    finally:
        connection.close()


def parse_json_array(value: str) -> list[Any]:
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return []
    return parsed if isinstance(parsed, list) else []


def stored_product_cards(value: str | None) -> list[ProductCard]:
    cards: list[ProductCard] = []
    for item in parse_json_array(value or ""):
        if len(cards) == 8:
            break
        if not isinstance(item, dict):
            continue
        try:
            cards.append(ProductCard.model_validate(item))
        except ValidationError:
            continue
    return cards


def load_chat_messages(user_id: int, limit: int = CHAT_HISTORY_LIMIT) -> list[ChatHistoryMessage]:
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, role, content, products_json, created_at
            FROM chat_messages
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        messages: list[ChatHistoryMessage] = []
        for row in reversed(rows):
            if row["role"] not in ("user", "assistant"):
                continue
            messages.append(
                ChatHistoryMessage(
                    id=row["id"],
                    role=row["role"],
                    content=row["content"],
                    products=stored_product_cards(row["products_json"]),
                    created_at=row["created_at"],
                )
            )
        return messages
    finally:
        connection.close()


def resolve_agent_page_context(page_context: ChatPageContext) -> AgentPageContext:
    product = None
    if page_context.page_type == "product" and page_context.product_id:
        connection = get_connection()
        try:
            row = connection.execute(
                "SELECT * FROM catalogue WHERE product_id = ?",
                (page_context.product_id,),
            ).fetchone()
            if row is not None:
                inventory = connection.execute(
                    "SELECT product_id, size, quantity FROM inventory WHERE product_id = ?",
                    (page_context.product_id,),
                ).fetchall()
                product = ProductCard.model_validate(product_record(row, inventory))
        finally:
            connection.close()
    return AgentPageContext(page_type=page_context.page_type, product=product)


def persist_chat_exchange(user_id: int, user_message: str, assistant_reply: AgentReply) -> None:
    products_json = (
        json.dumps([product.model_dump(mode="json") for product in assistant_reply.products])
        if assistant_reply.products
        else None
    )
    connection = get_connection(readonly=False)
    try:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)",
            (user_id, user_message),
        )
        connection.execute(
            """
            INSERT INTO chat_messages (user_id, role, content, products_json)
            VALUES (?, 'assistant', ?, ?)
            """,
            (user_id, assistant_reply.reply, products_json),
        )
        connection.commit()
    except sqlite3.Error:
        connection.rollback()
        raise
    finally:
        connection.close()


def size_order(size: str) -> tuple[int, str]:
    order = {"XXS": 0, "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "XXL": 6, "2XL": 6, "3XL": 7}
    return order.get(size.upper(), 50), size


def product_record(row: sqlite3.Row, inventory: list[sqlite3.Row]) -> dict[str, Any]:
    stock = [
        {"size": item["size"], "quantity": item["quantity"]}
        for item in sorted(inventory, key=lambda item: size_order(item["size"]))
    ]
    image_name = Path(row["image_file_path"]).name
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "garment_type": row["garment_type"],
        "description": row["description"],
        "colors": parse_json_array(row["colors"]),
        "search_tags": parse_json_array(row["search_tags"]),
        "image_url": f"/images/{image_name}",
        "price": row["price"],
        "inventory": stock,
        "total_stock": sum(item["quantity"] for item in stock),
    }


def fetch_products(search: str | None = None) -> list[dict[str, Any]]:
    connection = get_connection()
    try:
        if search:
            pattern = f"%{search.strip()}%"
            rows = connection.execute(
                """
                SELECT * FROM catalogue
                WHERE name LIKE ? OR garment_type LIKE ? OR description LIKE ? OR search_tags LIKE ?
                ORDER BY name COLLATE NOCASE
                """,
                (pattern, pattern, pattern, pattern),
            ).fetchall()
        else:
            rows = connection.execute("SELECT * FROM catalogue ORDER BY name COLLATE NOCASE").fetchall()

        inventory_rows = connection.execute(
            "SELECT product_id, size, quantity FROM inventory"
        ).fetchall()
        by_product: dict[str, list[sqlite3.Row]] = {}
        for item in inventory_rows:
            by_product.setdefault(item["product_id"], []).append(item)
        return [product_record(row, by_product.get(row["product_id"], [])) for row in rows]
    except sqlite3.Error as error:
        raise HTTPException(status_code=500, detail="Could not read the product catalog.") from error
    finally:
        connection.close()


def load_cart(user_id: int) -> CartReply:
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT ci.product_id, ci.size, ci.quantity,
                   c.name, c.image_file_path, c.description, c.price,
                   COALESCE(i.quantity, 0) AS available_quantity
            FROM cart_items AS ci
            JOIN catalogue AS c ON c.product_id = ci.product_id
            LEFT JOIN inventory AS i
              ON i.product_id = ci.product_id AND i.size = ci.size
            WHERE ci.user_id = ?
            ORDER BY ci.created_at, c.name COLLATE NOCASE
            """,
            (user_id,),
        ).fetchall()
        items = [
            CartLine(
                product_id=row["product_id"],
                name=row["name"],
                image_url=f"/images/{Path(row['image_file_path']).name}",
                description=row["description"],
                price=row["price"],
                size=row["size"],
                quantity=row["quantity"],
                available_quantity=row["available_quantity"],
                line_total=round(row["price"] * row["quantity"], 2),
            )
            for row in rows
        ]
        return CartReply(
            items=items,
            item_count=sum(item.quantity for item in items),
            total=round(sum(item.line_total for item in items), 2),
        )
    except sqlite3.Error as error:
        raise HTTPException(status_code=500, detail="Could not read the cart.") from error
    finally:
        connection.close()


def authenticated_cart_user(request: Request) -> sqlite3.Row:
    user = get_session_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in to use your saved cart.")
    return user


def check_cart_stock(connection: sqlite3.Connection, item: CartItemRequest, current: int = 0) -> None:
    row = connection.execute(
        """
        SELECT c.product_id, i.quantity
        FROM catalogue AS c
        LEFT JOIN inventory AS i ON i.product_id = c.product_id AND i.size = ?
        WHERE c.product_id = ?
        """,
        (item.size, item.product_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="That product is no longer in the catalog.")
    available = row["quantity"] or 0
    if available < 1:
        raise HTTPException(status_code=409, detail=f"Size {item.size} is currently out of stock.")
    if current + item.quantity > available:
        raise HTTPException(status_code=409, detail=f"Only {available} are available in size {item.size}.")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/cart", response_model=CartReply)
def get_cart(request: Request) -> CartReply:
    user = authenticated_cart_user(request)
    return load_cart(user["id"])


@app.post("/api/cart/items", response_model=CartReply)
def add_cart_item(payload: CartItemRequest, request: Request) -> CartReply:
    user = authenticated_cart_user(request)
    connection = get_connection(readonly=False)
    try:
        connection.execute("BEGIN IMMEDIATE")
        existing = connection.execute(
            "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
            (user["id"], payload.product_id, payload.size),
        ).fetchone()
        current = existing["quantity"] if existing else 0
        check_cart_stock(connection, payload, current)
        connection.execute(
            """
            INSERT INTO cart_items (user_id, product_id, size, quantity)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, product_id, size) DO UPDATE SET
                quantity = cart_items.quantity + excluded.quantity,
                updated_at = datetime('now')
            """,
            (user["id"], payload.product_id, payload.size, payload.quantity),
        )
        connection.commit()
    except HTTPException:
        connection.rollback()
        raise
    except sqlite3.Error as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail="Could not add that item to your cart.") from error
    finally:
        connection.close()
    return load_cart(user["id"])


@app.patch("/api/cart/items", response_model=CartReply)
def update_cart_item(payload: CartQuantityRequest, request: Request) -> CartReply:
    user = authenticated_cart_user(request)
    connection = get_connection(readonly=False)
    try:
        connection.execute("BEGIN IMMEDIATE")
        check_cart_stock(connection, payload)
        cursor = connection.execute(
            """
            UPDATE cart_items SET quantity = ?, updated_at = datetime('now')
            WHERE user_id = ? AND product_id = ? AND size = ?
            """,
            (payload.quantity, user["id"], payload.product_id, payload.size),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="That item is not in your cart.")
        connection.commit()
    except HTTPException:
        connection.rollback()
        raise
    except sqlite3.Error as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail="Could not update your cart.") from error
    finally:
        connection.close()
    return load_cart(user["id"])


@app.delete("/api/cart/items", response_model=CartReply)
def delete_cart_item(
    request: Request,
    product_id: str = Query(min_length=1, max_length=120),
    size: str = Query(min_length=1, max_length=32),
) -> CartReply:
    user = authenticated_cart_user(request)
    connection = get_connection(readonly=False)
    try:
        connection.execute(
            "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
            (user["id"], product_id, size),
        )
        connection.commit()
    except sqlite3.Error as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail="Could not remove that item from your cart.") from error
    finally:
        connection.close()
    return load_cart(user["id"])


def pydantic_message_history(turns: list[Any]) -> list[Any]:
    messages: list[Any] = []
    for turn in turns[-10:]:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return messages


@app.get("/api/chat/history", response_model=ChatHistoryReply)
def chat_history(request: Request) -> ChatHistoryReply:
    user = get_session_user(request)
    if user is None:
        return ChatHistoryReply()
    try:
        return ChatHistoryReply(messages=load_chat_messages(user["id"]))
    except sqlite3.Error as error:
        logging.error("Chat history read failed (%s).", type(error).__name__)
        raise HTTPException(status_code=500, detail="Could not load chat history.") from error


@app.post("/api/chat", response_model=ChatReply)
async def chat(payload: ChatRequest, request: Request) -> ChatReply:
    run_id = uuid4().hex
    append_audit_event(
        run_id=run_id,
        event="agent_run_started",
        tool_name="agent.run",
        arguments={
            "message_chars": len(payload.message),
            "history_turns_received": len(payload.history),
            "page_type": payload.page_context.page_type,
            "has_product_context": bool(payload.page_context.product_id),
        },
        result={"status": "started"},
    )
    if not PORTKEY_CONFIGURED:
        append_audit_event(
            run_id=run_id,
            event="agent_run_stopped",
            tool_name="agent.run",
            result={"status": "not_configured"},
            stop_reason="model_not_configured",
        )
        raise HTTPException(status_code=503, detail="The chat assistant is not configured.")

    try:
        user = get_session_user(request)
        if user is not None:
            stored_history = load_chat_messages(user["id"], limit=CHAT_CONTEXT_LIMIT)
            turns = [ChatTurn(role=item.role, content=item.content) for item in stored_history]
        else:
            turns = payload.history
        agent_page_context = resolve_agent_page_context(payload.page_context)
    except sqlite3.Error as error:
        logging.error("Chat context read failed (%s).", type(error).__name__)
        append_audit_event(
            run_id=run_id,
            event="agent_run_stopped",
            tool_name="agent.run",
            result={"error_type": type(error).__name__},
            stop_reason="context_error",
        )
        raise HTTPException(status_code=500, detail="Could not load chat context.") from error

    shopper = (
        ShopperProfile(name=user["name"], email=user["email"])
        if user is not None
        else None
    )
    try:
        result = await shop_agent.run(
            payload.message,
            deps=AgentDependencies(
                database_path=DATABASE_PATH,
                customer=shopper,
                page_context=agent_page_context,
                audit_run_id=run_id,
            ),
            message_history=pydantic_message_history(turns),
            usage_limits=AGENT_USAGE_LIMITS,
        )
    except asyncio.CancelledError:
        append_audit_event(
            run_id=run_id,
            event="agent_run_stopped",
            tool_name="agent.run",
            result={"status": "cancelled"},
            stop_reason="request_cancelled",
        )
        raise
    except Exception as error:
        # Keep prompts, credentials, and upstream response bodies out of application logs.
        logging.error("Pydantic AI chat request failed (%s).", type(error).__name__)
        append_audit_event(
            run_id=run_id,
            event="agent_run_stopped",
            tool_name="agent.run",
            result={"error_type": type(error).__name__},
            stop_reason=(
                "usage_limit_reached"
                if isinstance(error, UsageLimitExceeded)
                else "agent_error"
            ),
        )
        raise HTTPException(
            status_code=502,
            detail="The chat assistant is temporarily unavailable. Please try again.",
        ) from error

    usage = result.usage
    append_audit_event(
        run_id=run_id,
        event="agent_run_completed",
        tool_name="agent.run",
        result={
            "products_returned": len(result.output.products),
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
        },
        stop_reason="structured_output_returned",
    )
    response = ChatReply(
        **result.output.model_dump(),
        usage=ChatUsage(
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            total_tokens=usage.input_tokens + usage.output_tokens,
        ),
    )
    if user is not None:
        try:
            persist_chat_exchange(user["id"], payload.message, result.output)
        except sqlite3.Error as error:
            logging.error("Chat history write failed (%s).", type(error).__name__)
            raise HTTPException(status_code=500, detail="Could not save chat history.") from error
    return response


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest, request: Request) -> dict[str, Any]:
    email = normalize_email(payload.email)
    full_name = f"{payload.first_name} {payload.last_name}"
    connection = get_connection(readonly=False)
    try:
        connection.execute("BEGIN IMMEDIATE")
        existing = connection.execute(
            "SELECT 1 FROM users WHERE lower(email) = ?",
            (email,),
        ).fetchone()
        if existing is not None:
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        encoded_password = hash_password(payload.password)
        cursor = connection.execute(
            """
            INSERT INTO users (name, email, password_hash, first_name, last_name)
            VALUES (?, ?, ?, ?, ?)
            """,
            (full_name, email, encoded_password, payload.first_name, payload.last_name),
        )
        connection.commit()
        row = find_user(connection, cursor.lastrowid)
        if row is None:
            raise HTTPException(status_code=500, detail="Account creation failed.")
        request.session.clear()
        request.session["user_id"] = row["id"]
        return public_user(row)
    except sqlite3.IntegrityError as error:
        connection.rollback()
        raise HTTPException(status_code=409, detail="An account with that email already exists.") from error
    except sqlite3.Error as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail="Account creation failed.") from error
    finally:
        connection.close()


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, Any]:
    email = normalize_email(payload.email)
    connection = get_connection(readonly=False)
    try:
        row = connection.execute(
            "SELECT * FROM users WHERE lower(email) = ?",
            (email,),
        ).fetchone()
        if row is None:
            PASSWORD_HASHER.verify(payload.password, DUMMY_PASSWORD_HASH)
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        stored_hash = row["password_hash"]
        if not verify_password(payload.password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        if not stored_hash.startswith("$argon2id$"):
            upgraded_hash = hash_password(payload.password)
            connection.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (upgraded_hash, row["id"]),
            )
            connection.commit()

        request.session.clear()
        request.session["user_id"] = row["id"]
        return public_user(row)
    except sqlite3.Error as error:
        raise HTTPException(status_code=500, detail="Sign-in failed.") from error
    finally:
        connection.close()


@app.get("/api/auth/me")
def current_user(request: Request) -> dict[str, Any] | None:
    user_id = request.session.get("user_id")
    if not isinstance(user_id, int):
        return None
    connection = get_connection()
    try:
        row = find_user(connection, user_id)
        if row is None:
            request.session.clear()
            return None
        return public_user(row)
    finally:
        connection.close()


@app.post("/api/auth/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "ok"}


@app.get("/api/products")
def list_products(q: str | None = Query(default=None, max_length=120)) -> list[dict[str, Any]]:
    return fetch_products(q)


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> dict[str, Any]:
    product = next(
        (item for item in fetch_products() if item["product_id"] == product_id),
        None,
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product
