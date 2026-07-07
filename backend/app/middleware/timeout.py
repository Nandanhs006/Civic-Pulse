import asyncio
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class TimeoutMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, timeout_seconds: float = 30.0):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            # Wrap request execution inside asyncio.wait_for
            return await asyncio.wait_for(
                call_next(request), timeout=self.timeout_seconds
            )
        except asyncio.TimeoutError:
            logger.error(
                f"[Timeout] Request to {request.url.path} timed out after {self.timeout_seconds}s"
            )
            return JSONResponse(
                status_code=504,
                content={
                    "detail": "Gateway Timeout: Request took too long to process."
                },
            )
