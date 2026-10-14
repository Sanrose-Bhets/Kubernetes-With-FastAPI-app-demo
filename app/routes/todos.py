from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, status

from app.database import todos
from app.models import Todo, TodoCreate, TodoUpdate

router = APIRouter(prefix="/api/todos", tags=["todos"])


def _serialize(doc: dict) -> Todo:
    return Todo(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        completed=doc.get("completed", False),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def _get_object_id(todo_id: str) -> ObjectId:
    try:
        return ObjectId(todo_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )


@router.get("", response_model=list[Todo])
async def list_todos(completed: bool | None = Query(default=None)):
    query = {} if completed is None else {"completed": completed}
    cursor = todos.find(query).sort("created_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.post("", response_model=Todo, status_code=status.HTTP_201_CREATED)
async def create_todo(payload: TodoCreate):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump() | {"created_at": now, "updated_at": now}
    result = await todos.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("/{todo_id}", response_model=Todo)
async def get_todo(todo_id: str):
    doc = await todos.find_one({"_id": _get_object_id(todo_id)})
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )
    return _serialize(doc)


@router.put("/{todo_id}", response_model=Todo)
async def update_todo(todo_id: str, payload: TodoUpdate):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )
    updates["updated_at"] = datetime.now(timezone.utc)
    doc = await todos.find_one_and_update(
        {"_id": _get_object_id(todo_id)},
        {"$set": updates},
        return_document=True,
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )
    return _serialize(doc)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id: str):
    result = await todos.delete_one({"_id": _get_object_id(todo_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )
