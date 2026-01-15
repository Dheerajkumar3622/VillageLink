"""
VillageLink ML Microservice
Flask-based Machine Learning Service
Port: 5000

Features:
- Item-to-Item Collaborative Filtering (Food Recommendations)
- Content-Based Filtering (Route Matching)
- LSTM Demand Prediction
- NLP for Sarpanch AI Chatbot
- Generative AI Integration (OpenAI)
- Sentiment Analysis
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os
from functools import lru_cache
import json

app = Flask(__name__)
CORS(app)

# ==================== COLLABORATIVE FILTERING ====================

class ItemToItemCF:
    """
    Item-to-Item Collaborative Filtering
    Used for food recommendations, route suggestions
    """
    
    def __init__(self):
        self.item_similarity = {}
        self.item_ids = []
        self.co_occurrence = {}
    
    def fit(self, interactions):
        """
        Build co-occurrence matrix from user interactions
        interactions: list of {"user_id": str, "item_id": str, "rating": float}
        """
        # Build co-occurrence matrix
        user_items = {}
        for interaction in interactions:
            uid = interaction['user_id']
            iid = interaction['item_id']
            if uid not in user_items:
                user_items[uid] = []
            user_items[uid].append(iid)
            if iid not in self.item_ids:
                self.item_ids.append(iid)
        
        # Calculate item co-occurrence
        for uid, items in user_items.items():
            for i, item1 in enumerate(items):
                for item2 in items[i+1:]:
                    key = tuple(sorted([item1, item2]))
                    self.co_occurrence[key] = self.co_occurrence.get(key, 0) + 1
        
        # Calculate similarity scores
        for item in self.item_ids:
            self.item_similarity[item] = {}
            for other_item in self.item_ids:
                if item != other_item:
                    key = tuple(sorted([item, other_item]))
                    self.item_similarity[item][other_item] = self.co_occurrence.get(key, 0)
    
    def recommend(self, user_history, n=5):
        """
        Get recommendations based on user history
        user_history: list of item_ids user has interacted with
        """
        scores = {}
        
        for hist_item in user_history:
            if hist_item in self.item_similarity:
                for other_item, sim in self.item_similarity[hist_item].items():
                    if other_item not in user_history:
                        scores[other_item] = scores.get(other_item, 0) + sim
        
        # Sort by score
        sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_items[:n]


# Global CF model instance
cf_model = ItemToItemCF()

# Sample training data (would load from database in production)
SAMPLE_INTERACTIONS = [
    {"user_id": "user1", "item_id": "samosa", "rating": 5},
    {"user_id": "user1", "item_id": "chai", "rating": 5},
    {"user_id": "user1", "item_id": "pakora", "rating": 4},
    {"user_id": "user2", "item_id": "samosa", "rating": 5},
    {"user_id": "user2", "item_id": "chai", "rating": 4},
    {"user_id": "user2", "item_id": "jalebi", "rating": 5},
    {"user_id": "user3", "item_id": "chai", "rating": 5},
    {"user_id": "user3", "item_id": "pakora", "rating": 5},
    {"user_id": "user3", "item_id": "poha", "rating": 4},
    {"user_id": "user4", "item_id": "dosa", "rating": 5},
    {"user_id": "user4", "item_id": "idli", "rating": 5},
    {"user_id": "user4", "item_id": "sambar", "rating": 5},
    {"user_id": "user5", "item_id": "dosa", "rating": 4},
    {"user_id": "user5", "item_id": "chai", "rating": 5},
    {"user_id": "user5", "item_id": "vada", "rating": 4},
]

cf_model.fit(SAMPLE_INTERACTIONS)


# ==================== CONTENT-BASED FILTERING ====================

class ContentBasedFilter:
    """
    Content-based filtering using feature matching
    Used for route matching, driver-passenger matching
    """
    
    def __init__(self):
        self.items = {}
    
    def add_item(self, item_id, features):
        """
        features: dict of feature_name -> value
        """
        self.items[item_id] = features
    
    def find_similar(self, query_features, n=5):
        """
        Find items similar to query features
        """
        scores = []
        
        for item_id, features in self.items.items():
            score = self._calculate_similarity(query_features, features)
            scores.append((item_id, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:n]
    
    def _calculate_similarity(self, query, item):
        """Calculate feature overlap score"""
        score = 0
        for key, value in query.items():
            if key in item:
                if item[key] == value:
                    score += 1
                elif isinstance(value, (int, float)) and isinstance(item[key], (int, float)):
                    # Numerical similarity
                    score += 1 / (1 + abs(value - item[key]))
        return score


cb_filter = ContentBasedFilter()


# ==================== NLP SERVICE (Sarpanch AI) ====================

class SarpanchAI:
    """
    NLP-powered chatbot for VillageLink
    Supports intent classification and entity extraction
    """
    
    def __init__(self):
        self.intents = {
            'book_ticket': ['book', 'ticket', 'travel', 'go to', 'bus', 'gaadi'],
            'check_status': ['status', 'where', 'track', 'kahan hai', 'location'],
            'cancel': ['cancel', 'refund', 'vapas', 'band'],
            'wallet': ['wallet', 'balance', 'paise', 'money', 'payment'],
            'food': ['food', 'khana', 'order', 'restaurant', 'mess'],
            'help': ['help', 'madad', 'problem', 'issue'],
            'greeting': ['hello', 'hi', 'namaste', 'namaskar'],
        }
        
        self.responses = {
            'book_ticket': 'Main aapki ticket book karne mein madad kar sakta hoon! Kahan jaana hai?',
            'check_status': 'Aapki booking ka status check kar raha hoon...',
            'cancel': 'Booking cancel karne ke liye, apna ticket ID batayein.',
            'wallet': 'Aapke wallet mein balance check kar raha hoon...',
            'food': 'Aas-paas ke food vendors dhundh raha hoon!',
            'help': 'Main yahaan madad ke liye hoon! Kya problem hai?',
            'greeting': 'Namaste! Main Sarpanch AI hoon. Aapki kya seva kar sakta hoon?',
            'unknown': 'Maaf kijiye, samajh nahi aaya. Kya aap dobara bata sakte hain?'
        }
    
    def classify_intent(self, query):
        """Classify user intent from query"""
        query_lower = query.lower()
        
        best_intent = 'unknown'
        best_score = 0
        
        for intent, keywords in self.intents.items():
            score = sum(1 for kw in keywords if kw in query_lower)
            if score > best_score:
                best_score = score
                best_intent = intent
        
        return {
            'intent': best_intent,
            'confidence': min(best_score / 3, 1.0)
        }
    
    def extract_entities(self, query):
        """Extract locations, numbers from query"""
        entities = {
            'locations': [],
            'numbers': [],
            'times': []
        }
        
        # Extract numbers (phone, amounts)
        import re
        numbers = re.findall(r'\d+', query)
        entities['numbers'] = numbers
        
        # Would use NER model in production
        # For now, simple keyword matching
        
        return entities
    
    def respond(self, query):
        intent = self.classify_intent(query)
        entities = self.extract_entities(query)
        
        response = self.responses.get(intent['intent'], self.responses['unknown'])
        
        return {
            'response': response,
            'intent': intent,
            'entities': entities
        }


sarpanch = SarpanchAI()


# ==================== GENERATIVE AI (OpenAI) ====================

def generate_with_openai(prompt, max_tokens=150):
    """
    Generate text using OpenAI API
    """
    import openai
    
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return {'error': 'OpenAI API key not configured', 'simulated': True, 'text': prompt[:100]}
    
    try:
        openai.api_key = api_key
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are Sarpanch AI, a helpful assistant for VillageLink rural transport app. Respond in Hinglish (mix of Hindi and English)."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens
        )
        return {
            'text': response.choices[0].message.content,
            'usage': response.usage
        }
    except Exception as e:
        return {'error': str(e)}


def generate_notification(user_name, event_type, details):
    """Generate personalized notification text"""
    prompt = f"""Generate a friendly SMS notification in Hinglish for:
User: {user_name}
Event: {event_type}
Details: {details}

Keep it under 160 characters and include an emoji."""
    
    return generate_with_openai(prompt, max_tokens=50)


# ==================== DEMAND PREDICTION ====================

class DemandPredictor:
    """
    Simple demand prediction using moving average
    In production, would use LSTM neural network
    """
    
    def __init__(self):
        self.history = {}
    
    def add_data(self, route_id, timestamp, demand):
        if route_id not in self.history:
            self.history[route_id] = []
        self.history[route_id].append({'timestamp': timestamp, 'demand': demand})
    
    def predict(self, route_id, hour_of_day):
        if route_id not in self.history:
            return {'predicted_demand': 10, 'confidence': 'LOW'}
        
        history = self.history[route_id]
        if len(history) < 5:
            return {'predicted_demand': 10, 'confidence': 'LOW'}
        
        # Simple moving average
        recent = [h['demand'] for h in history[-7:]]
        avg = sum(recent) / len(recent)
        
        # Time-of-day adjustment
        if 7 <= hour_of_day <= 9 or 17 <= hour_of_day <= 19:
            avg *= 1.5  # Peak hours
        
        return {
            'predicted_demand': int(avg),
            'confidence': 'HIGH' if len(recent) >= 7 else 'MEDIUM'
        }


demand_predictor = DemandPredictor()


# ==================== SENTIMENT ANALYSIS ====================

def analyze_sentiment(text):
    """
    Simple sentiment analysis
    In production, would use BERT model
    """
    positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'nice', 'accha', 'bahut accha']
    negative_words = ['bad', 'terrible', 'worst', 'hate', 'poor', 'kharab', 'bura']
    
    text_lower = text.lower()
    
    pos_score = sum(1 for w in positive_words if w in text_lower)
    neg_score = sum(1 for w in negative_words if w in text_lower)
    
    if pos_score > neg_score:
        return {'sentiment': 'positive', 'score': pos_score / (pos_score + neg_score + 1)}
    elif neg_score > pos_score:
        return {'sentiment': 'negative', 'score': neg_score / (pos_score + neg_score + 1)}
    else:
        return {'sentiment': 'neutral', 'score': 0.5}


# ==================== API ENDPOINTS ====================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'ml-service',
        'models': {
            'collaborative_filtering': 'active',
            'content_based': 'active',
            'nlp': 'active',
            'openai': 'configured' if os.environ.get('OPENAI_API_KEY') else 'not_configured'
        }
    })


# Collaborative Filtering - Food Recommendations
@app.route('/recommend/food', methods=['POST'])
def recommend_food():
    data = request.json
    order_history = data.get('orderHistory', [])
    
    if not order_history:
        # Return popular items
        return jsonify({
            'recommendations': [('samosa', 10), ('chai', 9), ('dosa', 8)],
            'source': 'popular'
        })
    
    recommendations = cf_model.recommend(order_history, n=5)
    return jsonify({
        'recommendations': recommendations,
        'source': 'collaborative_filtering'
    })


# Collaborative Filtering - Train with new data
@app.route('/recommend/train', methods=['POST'])
def train_recommendations():
    data = request.json
    interactions = data.get('interactions', [])
    
    if interactions:
        cf_model.fit(interactions)
    
    return jsonify({'success': True, 'trained_on': len(interactions)})


# Content-Based - Route Matching
@app.route('/match/routes', methods=['POST'])
def match_routes():
    data = request.json
    query = data.get('query', {})
    
    similar = cb_filter.find_similar(query, n=5)
    return jsonify({'matches': similar})


# NLP - Sarpanch AI Chat
@app.route('/ai/chat', methods=['POST'])
def chat():
    data = request.json
    query = data.get('query', '')
    
    result = sarpanch.respond(query)
    return jsonify(result)


# Generative AI - Advanced Chat
@app.route('/ai/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt', '')
    
    result = generate_with_openai(prompt)
    return jsonify(result)


# Generative AI - Notification
@app.route('/ai/notification', methods=['POST'])
def notification():
    data = request.json
    result = generate_notification(
        data.get('userName', 'User'),
        data.get('eventType', 'Update'),
        data.get('details', '')
    )
    return jsonify(result)


# Demand Prediction
@app.route('/predict/demand', methods=['POST'])
def predict_demand():
    data = request.json
    route_id = data.get('routeId', 'default')
    hour = data.get('hour', 12)
    
    result = demand_predictor.predict(route_id, hour)
    return jsonify(result)


# Sentiment Analysis
@app.route('/analyze/sentiment', methods=['POST'])
def sentiment():
    data = request.json
    text = data.get('text', '')
    
    result = analyze_sentiment(text)
    return jsonify(result)


# Churn Risk Analysis
@app.route('/analyze/churn', methods=['POST'])
def churn():
    data = request.json
    
    # Simple rule-based churn prediction
    last_active_days = data.get('daysSinceLastActivity', 0)
    total_bookings = data.get('totalBookings', 0)
    avg_rating = data.get('avgRating', 5)
    
    risk_score = 0
    
    if last_active_days > 30:
        risk_score += 0.4
    if total_bookings < 3:
        risk_score += 0.3
    if avg_rating < 3:
        risk_score += 0.3
    
    return jsonify({
        'churn_risk': min(risk_score, 1.0),
        'risk_level': 'HIGH' if risk_score > 0.6 else 'MEDIUM' if risk_score > 0.3 else 'LOW',
        'suggestions': [
            'Send personalized offer' if risk_score > 0.5 else 'Regular engagement',
            'Collect feedback' if avg_rating < 4 else 'Maintain quality'
        ]
    })


if __name__ == '__main__':
    port = int(os.environ.get('ML_SERVICE_PORT', 5000))
    print(f"🤖 ML Microservice starting on port {port}")
    print(f"   OpenAI: {'Configured' if os.environ.get('OPENAI_API_KEY') else 'Not configured'}")
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', False))
