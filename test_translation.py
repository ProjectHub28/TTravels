#!/usr/bin/env python3
"""
Test script for the translation service
"""

from services.translate import translation_service

def test_translation():
    """Test the translation service."""
    print("🧪 Testing Translation Service")
    print("=" * 40)
    
    # Test cases
    test_cases = [
        ("Hello, how are you?", "hi", "English to Hindi"),
        ("नमस्ते, आप कैसे हैं?", "en", "Hindi to English"),
        ("Bonjour, comment allez-vous?", "en", "French to English"),
        ("Hola, ¿cómo estás?", "en", "Spanish to English"),
    ]
    
    for text, target_lang, description in test_cases:
        print(f"\n📝 {description}")
        print(f"Input: {text}")
        
        try:
            # Detect language
            detected_lang, confidence = translation_service.detect_language(text)
            print(f"Detected language: {detected_lang} (confidence: {confidence:.2f})")
            
            # Translate
            translated_text = translation_service.translate_text(text, detected_lang, target_lang)
            print(f"Translated: {translated_text}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n✅ Translation test completed!")

if __name__ == "__main__":
    test_translation()
