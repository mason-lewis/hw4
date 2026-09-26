"""Request, response, product, and agent dependency types."""

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class StockSize(BaseModel):
    size: str
    quantity: int


class ProductCard(BaseModel):
    product_id: str
    name: str
    garment_type: str
    description: str
    price: float = Field(ge=0)
    image_url: str
    colors: list[str] = Field(default_factory=list)
    inventory: list[StockSize] = Field(default_factory=list)
    total_stock: int = Field(ge=0)


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatPageContext(BaseModel):
    page_type: Literal["home", "products", "product", "about", "login", "create-account", "other"] = "other"
    product_id: str | None = Field(default=None, max_length=120)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)
    page_context: ChatPageContext = Field(default_factory=ChatPageContext)

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be blank.")
        return cleaned


class AgentReply(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)
    products: list[ProductCard] = Field(default_factory=list, max_length=8)


class ChatUsage(BaseModel):
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)


class ChatReply(AgentReply):
    usage: ChatUsage


class ChatHistoryMessage(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list, max_length=8)
    created_at: str


class ChatHistoryReply(BaseModel):
    messages: list[ChatHistoryMessage] = Field(default_factory=list, max_length=100)


class CartItemRequest(BaseModel):
    product_id: str = Field(min_length=1, max_length=120)
    size: str = Field(min_length=1, max_length=32)
    quantity: int = Field(ge=1, le=99)


class CartQuantityRequest(CartItemRequest):
    pass


class CartLine(BaseModel):
    product_id: str
    name: str
    image_url: str
    description: str
    price: float = Field(ge=0)
    size: str
    quantity: int = Field(ge=1)
    available_quantity: int = Field(ge=0)
    line_total: float = Field(ge=0)


class CartReply(BaseModel):
    items: list[CartLine] = Field(default_factory=list)
    item_count: int = Field(ge=0)
    total: float = Field(ge=0)


class ShopperProfile(BaseModel):
    name: str
    email: str


class AgentPageContext(BaseModel):
    page_type: Literal["home", "products", "product", "about", "login", "create-account", "other"]
    product: ProductCard | None = None


@dataclass(frozen=True)
class AgentDependencies:
    database_path: Path
    customer: ShopperProfile | None = None
    page_context: AgentPageContext | None = None
    audit_run_id: str | None = None
