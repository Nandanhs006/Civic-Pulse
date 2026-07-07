# A Practical Guide to SOLID Principles in Python
*Learned through the Civic Pulse Codebase Architecture*

This educational guide breaks down each of the five **SOLID** principles of Object-Oriented Design, compared directly with actual examples from the **Civic Pulse** project.

---

## 1. Single Responsibility Principle (SRP)
> *"A class should have one, and only one, reason to change."*

### 💡 The Analogy:
Think of a kitchen. A **chef** cooks the food. A **dishwasher** cleans the plates. A **waiter** serves the customers. If you have one person doing all three jobs, the kitchen crashes when the restaurant gets busy. If you want to change how you clean plates, you shouldn't have to retrain the chef.

### ❌ Bad (Non-SRP) Code:
Here, one giant class handles suggestions, file writes, database commits, and AI translation:
```python
class CivicPulseManager:
    def process_suggestion(self, content, audio_file):
        # 1. Save file to disk
        with open(f"/uploads/{audio_file.filename}", "wb") as f:
            f.write(audio_file.file.read())
            
        # 2. Translate text (NLP logic)
        translation = f"Translated: {content}"
        
        # 3. Save to Database
        db.execute("INSERT INTO suggestions ...")
```
*Why it's bad*: If you decide to change how files are saved (e.g. upload to Google Cloud Storage instead of local disk), you have to edit this entire class, risking breaking the database or NLP logic.

###  Good (SRP) Code in Civic Pulse:
We split this into dedicated classes, each with **one single job**:
1. **`FileService`**: Only knows how to save files (local disk or Google Cloud Storage).
2. **`AIService`**: Only knows how to call Gemini to translate and classify text.
3. **`SuggestionService`**: Orchestrates suggestion records and saves them to the DB.

---

## 2. Open/Closed Principle (OCP)
> *"Software entities (classes, modules, functions) should be open for extension, but closed for modification."*

### 💡 The Analogy:
Think of a **universal wall plug adapter**. If you buy a new device with a UK plug, you don't dismantle your house's electrical outlets (modifying the wall). You just plug in an adapter (extending the system).

### ❌ Bad (Non-OCP) Code:
Every time we want to add a new file storage type, we have to modify the saving function with `if/else` checks:
```python
class FileService:
    def save(self, file, target):
        if target == "local":
            self.save_local(file)
        elif target == "s3":
            self.save_to_s3(file)
        elif target == "gcs":
            self.save_to_gcs(file)  # Modifying this file repeatedly!
```

###  Good (OCP) Code in Civic Pulse:
We declare a standard service interface. If we want to support a new storage destination, we create a subclass that extends the base capability:
```python
class BaseStorageService:
    def save_file(self, file) -> str:
        raise NotImplementedError

class LocalStorageService(BaseStorageService):
    def save_file(self, file):
        # save locally...
        return "/static/local_url"

class GoogleCloudStorageService(BaseStorageService):
    def save_file(self, file):
        # upload to GCP...
        return "https://storage.googleapis.com/..."
```
Now, if a new storage requirement arises, we write a **new class** (Open for extension) without changing any code in `SuggestionService` or our API endpoints (Closed for modification).

---

## 3. Liskov Substitution Principle (LSP)
> *"Subclasses must be substitutable for their base classes without altering the correctness of the program."*

### 💡 The Analogy:
If it looks like a duck, quacks like a duck, but needs batteries to function, you probably have a toy duck. A toy duck cannot be substituted for a real duck in a pond without breaking the "pond system" expectations (LSP violation).

### ❌ Bad (Non-LSP) Code:
A subclass changes how a method behaves so drastically that it breaks the caller:
```python
class BasicAIService:
    def analyze_text(self, text: str) -> dict:
        return {"category": "Roads", "priority_score": 80}

class AdvancedAIService(BasicAIService):
    def analyze_text(self, text: str) -> dict:
        # Instead of returning a dictionary, it throws an error or returns raw text
        return "Roads, 80"  # BREAKS SuggestionsService which expects a dict!
```

###  Good (LSP) Code in Civic Pulse:
Our `AIService` checks for `use_gemini`. Whether it uses the **Gemini 1.5 Flash API** or falls back to the **local heuristic regex rules**, it always returns the exact same structure:
```python
{
    "english_translation": str,
    "category": str,
    "sentiment": str,
    "priority_score": int
}
```
Because the return signatures and parameters are identical, the high-level FastAPI controller can substitute either option transparently.

---

## 4. Interface Segregation Principle (ISP)
> *"Clients should not be forced to depend on interfaces they do not use."*

### 💡 The Analogy:
Think of a **Swiss Army Knife**. If you just need a toothpick, you shouldn't have to carry a 5-pound metal block containing saws, scissors, and bottle openers just to get that toothpick.

### ❌ Bad (Non-ISP) Code:
A monolithic interface forces classes to implement unused methods:
```python
class MassiveAppInterface:
    def save_file(self): ...
    def analyze_image(self): ...
    def query_voters(self): ...
    def process_billing(self): ...
```
If a class only needs to analyze text, it is forced to inherit billing and file saving methods.

###  Good (ISP) Code in Civic Pulse:
Our backend divides responsibilities into tiny, highly focused classes:
* `LocationService`: Only knows about resolving GPS/Constituency coordinates.
* `GeoService`: Only knows about Point-in-Polygon boundary math.
* `FileService`: Only knows about file storage.

No service is forced to inherit or use methods it doesn't need.

---

## 5. Dependency Inversion Principle (DIP)
> *"High-level modules should not depend on low-level modules. Both should depend on abstractions."*

### 💡 The Analogy:
If you want to plug a lamp into a wall socket, you don't solder the lamp wire directly into the copper pipes of your house. You use a plug. The plug is the abstraction that separates the lamp (high-level) from the power grid (low-level).

### ❌ Bad (Non-DIP) Code:
The service class hardcodes its connection, making it impossible to test offline or mock:
```python
from app.db.session import engine # Hardcoded concrete connection!

class SuggestionService:
    def create_suggestion(self, content):
        # Queries directly using the global production connection
        engine.execute("...")
```

###  Good (DIP) Code in Civic Pulse:
We use **Dependency Injection**. The service receives the database connection as a parameter when instantiated:
```python
class SuggestionService:
    def __init__(self, db: Session, file_srv=None, ai_srv=None):
        self.db = db
        self.file_service = file_srv or default_file_service
        self.ai_service = ai_srv or default_ai_service
```
This is the ultimate DIP design:
1. **Production**: FastAPI injects the PostgreSQL database session.
2. **Testing**: We inject an in-memory SQLite connection (`test.db`) and mock AI service objects, allowing tests to run instantly without making network calls or hitting the main DB.
