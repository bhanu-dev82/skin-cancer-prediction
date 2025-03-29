from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.efficientnet import EfficientNetB0, preprocess_input as efficientnet_preprocess
from tensorflow.keras.preprocessing import image
import io

app = Flask(__name__)

# Load models
models = {
    'MobileNetV2': None,
    'EfficientNetB0': None
}

# Class labels for HAM10000 dataset
class_labels = {
    'akiec': 'Actinic Keratosis',
    'bcc': 'Basal Cell Carcinoma',
    'bkl': 'Benign Keratosis',
    'df': 'Dermatofibroma',
    'mel': 'Melanoma',
    'nv': 'Melanocytic Nevus',
    'vasc': 'Vascular Lesion'
}

# Class descriptions
class_descriptions = {
    'akiec': {
        'name': 'Actinic Keratosis',
        'description': 'A precancerous growth caused by sun damage that may develop into skin cancer if left untreated.'
    },
    'bcc': {
        'name': 'Basal Cell Carcinoma',
        'description': 'The most common type of skin cancer, usually appearing as a shiny bump or pink patch on sun-exposed areas.'
    },
    'bkl': {
        'name': 'Benign Keratosis',
        'description': 'A non-cancerous growth that appears as a waxy, scaly, slightly raised growth on the skin.'
    },
    'df': {
        'name': 'Dermatofibroma',
        'description': 'A common benign skin growth that often appears as a small, firm bump on the skin.'
    },
    'mel': {
        'name': 'Melanoma',
        'description': 'The most serious form of skin cancer that develops in the cells that produce melanin.'
    },
    'nv': {
        'name': 'Melanocytic Nevus',
        'description': 'A common mole that appears as a small, dark brown spot caused by clusters of pigmented cells.'
    },
    'vasc': {
        'name': 'Vascular Lesion',
        'description': 'An abnormality of blood vessels that can appear as red or purple marks on the skin.'
    }
}

def load_model(model_name):
    """Load the specified model"""
    global models

    if model_name not in models:
        # Initialize models dictionary if needed
        initialize_models()

    if models[model_name] is None:
        if model_name == 'MobileNetV2':
            try:
                # Load the entire model instead of just weights
                model_path = 'models/mobilenetv2_ham10000_finetuned_74.h5'
                app.logger.info(f"Loading MobileNetV2 model from {model_path}")

                # Check if file exists
                if not os.path.exists(model_path):
                    app.logger.error(f"Model file not found: {model_path}")
                    raise FileNotFoundError(f"Model file not found: {model_path}")

                # Load the model with custom objects if needed
                models[model_name] = tf.keras.models.load_model(model_path, compile=False)

                # Compile the model
                models[model_name].compile(
                    optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
                    loss='categorical_crossentropy',
                    metrics=['accuracy']
                )

                app.logger.info("MobileNetV2 model loaded and compiled successfully")

            except Exception as e:
                app.logger.error(f"Error loading MobileNetV2 model: {str(e)}")
                # Try an alternative approach - load model with custom_objects
                try:
                    app.logger.info("Attempting to load model with custom_objects...")
                    models[model_name] = tf.keras.models.load_model(
                        'models/mobilenetv2_ham10000_finetuned_74.h5',
                        custom_objects={
                            'Adam': tf.keras.optimizers.Adam,
                            'categorical_crossentropy': tf.keras.losses.categorical_crossentropy
                        },
                        compile=False
                    )

                    # Compile the model
                    models[model_name].compile(
                        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
                        loss='categorical_crossentropy',
                        metrics=['accuracy']
                    )

                    app.logger.info("MobileNetV2 model loaded with custom_objects successfully")
                except Exception as e2:
                    app.logger.error(f"Second attempt failed: {str(e2)}")
                    raise RuntimeError(f"Failed to load MobileNetV2 model: {str(e)} and {str(e2)}")

        elif model_name == 'EfficientNetB0':
            try:
                # Load the entire model instead of just weights
                model_path = 'models/efficientnetb0_skin_cancer_model_final_69.keras'
                app.logger.info(f"Loading EfficientNetB0 model from {model_path}")

                # Check if file exists
                if not os.path.exists(model_path):
                    app.logger.error(f"Model file not found: {model_path}")
                    raise FileNotFoundError(f"Model file not found: {model_path}")

                # Load the model with custom objects if needed
                models[model_name] = tf.keras.models.load_model(model_path, compile=False)

                # Compile the model
                models[model_name].compile(
                    optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
                    loss='categorical_crossentropy',
                    metrics=['accuracy']
                )

                app.logger.info("EfficientNetB0 model loaded and compiled successfully")

            except Exception as e:
                app.logger.error(f"Error loading EfficientNetB0 model: {str(e)}")
                # Try an alternative approach - load model with custom_objects
                try:
                    app.logger.info("Attempting to load model with custom_objects...")
                    models[model_name] = tf.keras.models.load_model(
                        model_path,
                        custom_objects={
                            'Adam': tf.keras.optimizers.Adam,
                            'categorical_crossentropy': tf.keras.losses.categorical_crossentropy
                        },
                        compile=False
                    )

                    # Compile the model
                    models[model_name].compile(
                        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
                        loss='categorical_crossentropy',
                        metrics=['accuracy']
                    )

                    app.logger.info("EfficientNetB0 model loaded with custom_objects successfully")
                except Exception as e2:
                    app.logger.error(f"Second attempt failed: {str(e2)}")
                    raise RuntimeError(f"Failed to load EfficientNetB0 model: {str(e)} and {str(e2)}")
        else:
            app.logger.error(f"Unknown model name: {model_name}")
            raise ValueError(f"Unknown model name: {model_name}")

    return models[model_name]

def preprocess_image(img, model_name):
    """Preprocess the image for the specified model"""
    img = img.resize((224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)

    if model_name == 'MobileNetV2':
        return mobilenet_preprocess(img_array)
    elif model_name == 'EfficientNetB0':
        return efficientnet_preprocess(img_array)

def predict_image(img, model_name):
    """Make a prediction on an image using the specified model"""
    app.logger.info(f"Preparing image for prediction with {model_name}")

    # Resize the image to the required input size
    img = img.resize((224, 224))

    # Convert to numpy array and preprocess
    img_array = np.array(img)
    img_array = img_array / 255.0  # Normalize to [0,1]
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension

    # Load the model if not already loaded
    model = load_model(model_name)

    # Make prediction
    app.logger.info("Running prediction...")
    preds = model.predict(img_array)
    app.logger.info(f"Raw prediction values: {preds}")

    # Check for NaN values
    if np.isnan(preds).any():
        app.logger.warning("NaN values detected in predictions. Replacing with zeros.")
        preds = np.nan_to_num(preds, nan=0.0)

    # Define class names for HAM10000 dataset
    class_names = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
    full_names = {
        'akiec': 'Actinic Keratosis',
        'bcc': 'Basal Cell Carcinoma',
        'bkl': 'Benign Keratosis',
        'df': 'Dermatofibroma',
        'mel': 'Melanoma',
        'nv': 'Melanocytic Nevus',
        'vasc': 'Vascular Lesion'
    }

    # Format predictions
    predictions = []
    for i, class_name in enumerate(class_names):
        confidence = float(preds[0][i])
        # Ensure confidence is a valid number
        if np.isnan(confidence) or np.isinf(confidence):
            confidence = 0.0

        predictions.append({
            'class': class_name,
            'name': full_names[class_name],
            'confidence': confidence
        })

    # Sort by confidence (highest first)
    predictions = sorted(predictions, key=lambda x: x['confidence'], reverse=True)

    app.logger.info(f"Prediction completed: {predictions}")
    return predictions

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect')
def detect():
    return render_template('detect.html',
                          class_descriptions=class_descriptions,
                          condition_info=class_descriptions)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/predict', methods=['POST'])
def predict():
    # Debug information
    app.logger.info(f"Request received: {request.method} {request.path}")
    app.logger.info(f"Request form data: {request.form}")
    app.logger.info(f"Request files: {request.files}")

    if 'file' not in request.files:
        app.logger.error("No file part in the request")
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    app.logger.info(f"File received: {file.filename}, content type: {file.content_type}")

    if file.filename == '':
        app.logger.error("No selected file (empty filename)")
        return jsonify({'error': 'No selected file'}), 400

    # Get the model name from the request and handle aliases
    model_name = request.form.get('model', 'MobileNetV2')
    app.logger.info(f"Using model: {model_name}")

    # Handle model name aliases
    if model_name.lower() in ['mobilenet', 'mobilenetv2', 'mobile']:
        model_name = 'MobileNetV2'
    elif model_name.lower() in ['efficientnet', 'efficientnetb0', 'efficient']:
        model_name = 'EfficientNetB0'

    # Check if the model is supported
    if model_name not in models:
        app.logger.error(f"Unsupported model: {model_name}")
        return jsonify({'error': f'Unsupported model: {model_name}. Supported models are: {", ".join(models.keys())}'}), 400

    try:
        # Check if model files exist
        if model_name == 'MobileNetV2' and not os.path.exists('models/mobilenetv2_ham10000_finetuned_74.h5'):
            app.logger.error("MobileNetV2 model file not found")
            return jsonify({'error': 'Model file not found. Please ensure the model is properly installed.'}), 500

        if model_name == 'EfficientNetB0' and not os.path.exists('models/efficientnetb0_skin_cancer_model_final_69.keras'):
            app.logger.error("EfficientNetB0 model file not found")
            return jsonify({'error': 'Model file not found. Please ensure the model is properly installed.'}), 500

        # Read and process the image
        img_bytes = file.read()
        if not img_bytes:
            app.logger.error("Empty file content")
            return jsonify({'error': 'Empty file content'}), 400

        app.logger.info(f"Image bytes length: {len(img_bytes)}")

        try:
            img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            app.logger.info(f"Image opened successfully: {img.size}")
        except Exception as img_error:
            app.logger.error(f"Failed to open image: {str(img_error)}")
            return jsonify({'error': f'Failed to open image: {str(img_error)}'}), 400

        # Make prediction
        app.logger.info("Starting prediction...")
        predictions = predict_image(img, model_name)
        app.logger.info(f"Prediction completed: {predictions}")

        return jsonify({
            'predictions': predictions
        })

    except Exception as e:
        import traceback
        app.logger.error(f"Prediction error: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)

    # Check if model files exist, otherwise print a warning
    if not os.path.exists('models/mobilenetv2_ham10000_finetuned_74.h5'):
        print("Warning: MobileNetV2 model file not found. Please download or train the model.")

    if not os.path.exists('models/efficientnetb0_skin_cancer_model_final_69.keras'):
        print("Warning: EfficientNetB0 model file not found. Please download or train the model.")

    app.run(debug=True)
