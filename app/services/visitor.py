import uuid
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status
from app.models.visitor import Visitor
from app.schemas.visitor import VisitorUpdateRequest

class VisitorService:
    @staticmethod
    def get_display_name(v_uuid: uuid.UUID, name: Optional[str]) -> str:
        """Get formatted display name based on name presence or uuid prefix"""
        if name and name.strip():
            return name.strip()
        # Return Visitor #XXXXXX where XXXXXX are first 6 characters of UUID hex
        uuid_hex = v_uuid.hex
        return f"Visitor #{uuid_hex[:6].upper()}"

    @staticmethod
    async def get_by_uuid(db: AsyncSession, v_uuid: uuid.UUID) -> Optional[Visitor]:
        """Fetch visitor by unique UUID"""
        stmt = select(Visitor).where(Visitor.uuid == v_uuid)
        result = await db.exec(stmt)
        return result.first()

    @staticmethod
    async def get_by_id(db: AsyncSession, visitor_id: uuid.UUID) -> Optional[Visitor]:
        """Fetch visitor by database primary key ID"""
        stmt = select(Visitor).where(Visitor.id == visitor_id)
        result = await db.exec(stmt)
        return result.first()

    @staticmethod
    async def get_or_create(
        db: AsyncSession,
        v_uuid: Optional[uuid.UUID] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None
    ) -> Visitor:
        """
        Fetch existing visitor using UUID or create a new visitor record.
        Saves provided details immediately.
        """
        visitor = None
        if v_uuid:
            visitor = await VisitorService.get_by_uuid(db, v_uuid)

        if not visitor:
            visitor = Visitor(
                uuid=v_uuid or uuid.uuid4(),
                name=name,
                phone=phone,
                email=email
            )
            db.add(visitor)
            await db.commit()
            await db.refresh(visitor)
        else:
            # Update details if provided during initialization
            updated = False
            if name is not None and visitor.name != name:
                visitor.name = name
                updated = True
            if phone is not None and visitor.phone != phone:
                visitor.phone = phone
                updated = True
            if email is not None and visitor.email != email:
                visitor.email = email
                updated = True
            
            if updated:
                db.add(visitor)
                await db.commit()
                await db.refresh(visitor)

        return visitor

    @staticmethod
    async def update(db: AsyncSession, visitor_id: uuid.UUID, schema: VisitorUpdateRequest) -> Visitor:
        """Update visitor information (name, phone, email)"""
        visitor = await VisitorService.get_by_id(db, visitor_id)
        if not visitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Visitor not found"
            )

        if schema.name is not None:
            visitor.name = schema.name if schema.name.strip() else None
        if schema.phone is not None:
            visitor.phone = schema.phone if schema.phone.strip() else None
        if schema.email is not None:
            visitor.email = schema.email if schema.email.strip() else None

        db.add(visitor)
        await db.commit()
        await db.refresh(visitor)
        return visitor
