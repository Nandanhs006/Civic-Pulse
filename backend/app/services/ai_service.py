import random
from typing import Dict, Any


class AIService:
    CATEGORIES = [
        "Water",
        "Roads",
        "Education",
        "Health",
        "Sanitation",
        "Public Spaces",
        "Electricity",
        "Safety",
    ]
    SENTIMENTS = ["Positive", "Neutral", "Negative"]

    @classmethod
    def transcribe_audio(cls, file_path: str) -> Dict[str, Any]:
        """
        Mock Whisper translation and transcription service.
        Detects language, creates a transcript, and translates it.
        """
        # Mock various user submissions
        mock_transcripts = [
            {
                "raw_text": "हाम्रो गाउँमा खानेपानीको ठूलो समस्या छ। तीन दिनदेखि पानी आएको छैन।",
                "language_code": "ne",
                "english_translation": "There is a big drinking water problem in our village. Water has not come for three days.",
                "category": "Water",
                "sentiment": "Negative",
                "priority_score": 85,
            },
            {
                "raw_text": "The main road near the high school has deep potholes and is very dangerous for children.",
                "language_code": "en",
                "english_translation": "The main road near the high school has deep potholes and is very dangerous for children.",
                "category": "Roads",
                "sentiment": "Negative",
                "priority_score": 78,
            },
            {
                "raw_text": "We need a local library or community learning center in our ward for youth education.",
                "language_code": "en",
                "english_translation": "We need a local library or community learning center in our ward for youth education.",
                "category": "Education",
                "sentiment": "Neutral",
                "priority_score": 60,
            },
            {
                "raw_text": "स्वास्थ्य चौकीमा डाक्टर नै भेटिदैन। औषधि पनि सकिएको छ भन्छन्।",
                "language_code": "ne",
                "english_translation": "A doctor is not found at the health post. They say medicine is also out of stock.",
                "category": "Health",
                "sentiment": "Negative",
                "priority_score": 90,
            },
        ]

        # Pick one randomly or construct a basic fallback
        result = random.choice(mock_transcripts)
        return result

    @classmethod
    def analyze_text(cls, text: str, language_code: str = "en") -> Dict[str, Any]:
        """
        Mock NLP service that translates text, classifies it into category/sentiment, and scores it.
        """
        lower_text = text.lower()
        category = "General"

        # Simple heuristic mapping for classification
        if any(
            w in lower_text
            for w in ["water", "drinking", "pipeline", "tap", "drain", "पानी", "ढल"]
        ):
            category = "Water"
        elif any(
            w in lower_text
            for w in [
                "road",
                "highway",
                "pothole",
                "street",
                "bridge",
                "बाटो",
                "सडक",
                "पुल",
            ]
        ):
            category = "Roads"
        elif any(
            w in lower_text
            for w in [
                "school",
                "college",
                "education",
                "teacher",
                "library",
                "विद्यालय",
                "शिक्षा",
            ]
        ):
            category = "Education"
        elif any(
            w in lower_text
            for w in [
                "health",
                "doctor",
                "clinic",
                "hospital",
                "medicine",
                "अस्पताल",
                "डाक्टर",
            ]
        ):
            category = "Health"
        elif any(
            w in lower_text
            for w in [
                "toilet",
                "waste",
                "garbage",
                "trash",
                "sanitation",
                "फोहोर",
                "शौचालय",
            ]
        ):
            category = "Sanitation"
        elif any(
            w in lower_text
            for w in ["light", "electricity", "power", "grid", "बिजुली", "बत्ती"]
        ):
            category = "Electricity"
        elif any(
            w in lower_text
            for w in ["park", "garden", "playground", "community", "पार्क", "खेलमैदान"]
        ):
            category = "Public Spaces"
        elif any(
            w in lower_text
            for w in ["safety", "police", "crime", "thief", "security", "सुरक्षा"]
        ):
            category = "Safety"
        else:
            category = random.choice(cls.CATEGORIES)

        # Sentiment heuristics
        sentiment = "Neutral"
        if any(
            w in lower_text
            for w in [
                "bad",
                "poor",
                "broken",
                "danger",
                "terrible",
                "worst",
                "problem",
                "गार्हो",
                "समस्या",
            ]
        ):
            sentiment = "Negative"
        elif any(
            w in lower_text
            for w in [
                "good",
                "great",
                "excellent",
                "thanks",
                "happy",
                "राम्रो",
                "धन्यवाद",
            ]
        ):
            sentiment = "Positive"

        # Priority calculation based on urgency indicators
        priority = 50
        if sentiment == "Negative":
            priority += 20
        if any(
            w in lower_text
            for w in [
                "urgent",
                "danger",
                "emergency",
                "immediately",
                "accident",
                "तुरन्त",
                "खतरा",
            ]
        ):
            priority += 25

        priority = min(max(priority + random.randint(-10, 10), 10), 100)

        return {
            "english_translation": (
                f"[Translation Model Mock] {text}" if language_code != "en" else text
            ),
            "category": category,
            "sentiment": sentiment,
            "priority_score": priority,
        }


ai_service = AIService()
