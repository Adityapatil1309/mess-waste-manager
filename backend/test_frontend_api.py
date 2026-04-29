import asyncio
from httpx import AsyncClient
from main import app

async def test():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # We need a valid token. Or we can just mock the get_current_user dependency
        pass

asyncio.run(test())
