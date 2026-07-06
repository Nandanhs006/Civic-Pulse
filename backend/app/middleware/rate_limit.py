import time
from fastapi import Request, HTTPException, status
import redis
from app.core.config import settings

# Global in-memory fallback cache in case Redis is down or running locally without Docker
_in_memory_cache = {}


def check_rate_limit(request: Request):
    """
    FastAPI dependency for sliding-window rate-limiting.
    Permits up to 5 suggestions per hour for citizens, and 100 requests/min for general API.
    """
    client_ip = request.client.host if request.client else "unknown_ip"
    current_time = time.time()
    
    # Check if path is suggestions submission or dashboard API
    is_submission = request.url.path.endswith("/api/v1/suggestions/") and request.method == "POST"
    
    limit = 5 if is_submission else 100
    window = 3600 if is_submission else 60
    key = f"rate_limit:{client_ip}:{request.url.path}"

    try:
        # Connect with timeout to prevent hanging
        r = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            socket_timeout=1.0,
            decode_responses=True
        )
        
        # Redis implementation using pipeline
        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, current_time - window)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.zcard(key)
        pipe.expire(key, window)
        _, _, count, _ = pipe.execute()

        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
            
    except (redis.ConnectionError, redis.TimeoutError):
        # Graceful fallback: In-memory dictionary
        if key not in _in_memory_cache:
            _in_memory_cache[key] = []
            
        # Clean older entries
        _in_memory_cache[key] = [t for t in _in_memory_cache[key] if t > current_time - window]
        
        # Add current timestamp
        _in_memory_cache[key].append(current_time)
        
        if len(_in_memory_cache[key]) > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later. (Fallback mode)"
            )
