
// At the beginning of your file, add this to ensure CLASS_DESCRIPTIONS is defined
// This assumes your class descriptions are passed from the Flask backend
const CLASS_DESCRIPTIONS = window.CLASS_DESCRIPTIONS || {
    'akiec': { name: 'Actinic Keratosis', description: 'A precancerous growth caused by sun damage.' },
    'bcc': { name: 'Basal Cell Carcinoma', description: 'The most common type of skin cancer.' },
    'bkl': { name: 'Benign Keratosis', description: 'A non-cancerous growth on the skin.' },
    'df': { name: 'Dermatofibroma', description: 'A common benign skin growth.' },
    'mel': { name: 'Melanoma', description: 'The most serious form of skin cancer.' },
    'nv': { name: 'Melanocytic Nevus', description: 'A common mole.' },
    'vasc': { name: 'Vascular Lesion', description: 'An abnormality of blood vessels.' }
};

// Define CONDITION_INFO if not already defined
const CONDITION_INFO = window.CONDITION_INFO || {
    'akiec': {
        severity: 'moderate',
        description: 'Actinic Keratosis is a precancerous growth caused by sun damage.',
        resources: [{ name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/actinic-keratosis/symptoms-causes/syc-20354969' }]
    },
    'bcc': {
        severity: 'high',
        description: 'Basal Cell Carcinoma is the most common type of skin cancer.',
        resources: [{ name: 'Skin Cancer Foundation', url: 'https://www.skincancer.org/skin-cancer-information/basal-cell-carcinoma/' }]
    },
    'bkl': {
        severity: 'low',
        description: 'Benign Keratosis is a non-cancerous growth that appears as a waxy, scaly growth on the skin.',
        resources: [{ name: 'American Academy of Dermatology', url: 'https://www.aad.org/public/diseases/bumps-and-growths/seborrheic-keratoses' }]
    },
    'df': {
        severity: 'low',
        description: 'Dermatofibroma is a common benign skin growth that often appears as a small, firm bump.',
        resources: [{ name: 'DermNet NZ', url: 'https://dermnetnz.org/topics/dermatofibroma' }]
    },
    'mel': {
        severity: 'very high',
        description: 'Melanoma is the most serious form of skin cancer that develops in the cells that produce melanin.',
        resources: [{ name: 'American Cancer Society', url: 'https://www.cancer.org/cancer/melanoma-skin-cancer.html' }]
    },
    'nv': {
        severity: 'low',
        description: 'Melanocytic Nevus is a common mole that appears as a small, dark brown spot caused by clusters of pigmented cells.',
        resources: [{ name: 'Cleveland Clinic', url: 'https://my.clevelandclinic.org/health/diseases/21880-moles' }]
    },
    'vasc': {
        severity: 'moderate',
        description: 'Vascular Lesion is an abnormality of blood vessels that can appear as red or purple marks on the skin.',
        resources: [{ name: 'Stanford Health Care', url: 'https://stanfordhealthcare.org/medical-conditions/skin-hair-and-nails/vascular-malformations.html' }]
    }
};


document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('image-preview')
    const removeImageBtn = document.getElementById('remove-image');
    const analyzeBtn = document.getElementById('analyze-button');
    const uploadForm = document.getElementById('upload-form');
    const loadingIndicator = document.getElementById('loading');
    const resultContainer = document.getElementById('result');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const modelSelect = document.getElementById('model-select');
    const modelUsedBadge = document.getElementById('model-used-badge');

    // Tab elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Result elements
    const resultImage = document.getElementById('result-image');
    const predictionElement = document.getElementById('prediction');
    const descriptionElement = document.getElementById('description');
    const confidenceElement = document.getElementById('confidence');
    const confidenceFill = document.getElementById('confidence-fill');
    const probabilitiesContainer = document.getElementById('probabilities');
    const severityIndicator = document.getElementById('severity-indicator');
    const infoConditionName = document.getElementById('info-condition-name');
    const conditionInformation = document.getElementById('condition-information');
    const resourcesList = document.getElementById('resources-list');
    const saveResultBtn = document.getElementById('save-result');
    const newAnalysisBtn = document.getElementById('new-analysis');

    // State
    let fileSelected = false;

    // Event Listeners
    uploadBox.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        resetUpload();
    });

    uploadForm.addEventListener('submit', handleFormSubmit);

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    newAnalysisBtn.addEventListener('click', resetAll);

    saveResultBtn.addEventListener('click', saveResults);

    // Functions
    function handleFileSelect(e) {
        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.match('image.*')) {
            showError('Please select an image file (JPEG, PNG, etc.)');
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.classList.remove('hidden');
            removeImageBtn.classList.remove('hidden');
            uploadBox.classList.add('has-image');
            fileSelected = true;
            analyzeBtn.disabled = false;
        };

        reader.readAsDataURL(file);
    }

    function resetUpload() {
        fileInput.value = '';
        previewContainer.classList.add('hidden');
        removeImageBtn.classList.add('hidden');
        uploadBox.classList.remove('has-image');
        fileSelected = false;
        analyzeBtn.disabled = true;
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        if (!fileSelected) {
            showError('Please select an image to analyze');
            return;
        }

        // Hide any previous results or errors
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');

        // Show loading indicator
        loadingIndicator.style.display = 'block';

        // Get the selected model
        const selectedModel = modelSelect.value;

        // Create form data
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('model', selectedModel);

        console.log('Uploading file:', fileInput.files[0].name);
        console.log('Selected model:', selectedModel);

        // Send the request
        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `Server error: ${response.status}`);
                }).catch(e => {
                    // If we can't parse JSON, use the status text
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';

            // Check if we have predictions
            if (!data.predictions || data.predictions.length === 0) {
                throw new Error('No predictions returned from the server');
            }

            // Display results
            displayResults(data, selectedModel);
        })
        .catch(error => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';

            // Show error message
            showError(`Error: ${error.message}`);
            console.error('Error:', error);
        });
    }

    function displayResults(data, modelName) {
        // Set the model badge
        modelUsedBadge.textContent = modelName;

        // Set the result image
        resultImage.src = previewImage.src;

        // Get the top prediction
        const topPrediction = data.predictions[0];
        const predictionClass = topPrediction.class;
        const confidence = topPrediction.confidence;

        // Set prediction details
        predictionElement.textContent = CLASS_DESCRIPTIONS[predictionClass].name;
        descriptionElement.textContent = CLASS_DESCRIPTIONS[predictionClass].description;

        // Set confidence
        const confidencePercent = Math.round(confidence * 100);
        confidenceElement.textContent = confidencePercent + '%';
        confidenceFill.style.width = confidencePercent + '%';

        // Set confidence color based on value
        if (confidencePercent >= 80) {
            confidenceFill.style.backgroundColor = 'var(--success-color)';
        } else if (confidencePercent >= 50) {
            confidenceFill.style.backgroundColor = 'var(--warning-color)';
        } else {
            confidenceFill.style.backgroundColor = 'var(--danger-color)';
        }

        // Display severity indicator
        const conditionInfo = CONDITION_INFO[predictionClass];
        let severityHTML = '';

        if (conditionInfo && conditionInfo.severity) {
            let severityClass = '';
            let severityIcon = '';

            switch (conditionInfo.severity) {
                case 'low':
                    severityClass = 'severity-low';
                    severityIcon = 'fa-check-circle';
                    break;
                case 'moderate':
                    severityClass = 'severity-moderate';
                    severityIcon = 'fa-exclamation-circle';
                    break;
                case 'high':
                    severityClass = 'severity-high';
                    severityIcon = 'fa-exclamation-triangle';
                    break;
                case 'very high':
                    severityClass = 'severity-very-high';
                    severityIcon = 'fa-radiation';
                    break;
            }

            severityHTML = `
            <h3>Severity Level</h3>
            <div class="severity-level ${severityClass}">
            <i class="fas ${severityIcon}"></i>
            <span class="severity-text">${conditionInfo.severity.charAt(0).toUpperCase() + conditionInfo.severity.slice(1)}</span>
            </div>
            <p class="mt-2">This is based on typical characteristics of this condition.</p>
            `;
        }

        severityIndicator.innerHTML = severityHTML;

        // Display all probabilities
        probabilitiesContainer.innerHTML = '';
        data.predictions.forEach(prediction => {
            const probabilityPercent = Math.round(prediction.confidence * 100);
            const probabilityHTML = `
            <div class="probability-item">
            <div class="probability-class">${CLASS_DESCRIPTIONS[prediction.class].name}</div>
            <div class="probability-bar">
            <div class="probability-fill" style="width: ${probabilityPercent}%"></div>
            </div>
            <div class="probability-value">${probabilityPercent}%</div>
            </div>
            `;
            probabilitiesContainer.innerHTML += probabilityHTML;
        });

        // Set condition information
        infoConditionName.textContent = CLASS_DESCRIPTIONS[predictionClass].name;

        if (conditionInfo && conditionInfo.description) {
            conditionInformation.textContent = conditionInfo.description;
        } else {
            conditionInformation.textContent = CLASS_DESCRIPTIONS[predictionClass].description;
        }

        // Set resources
        resourcesList.innerHTML = '';
        if (conditionInfo && conditionInfo.resources) {
            conditionInfo.resources.forEach(resource => {
                const resourceHTML = `
                <li>
                <a href="${resource.url}" target="_blank">
                <i class="fas fa-external-link-alt"></i>
                ${resource.name}
                </a>
                </li>
                `;
                resourcesList.innerHTML += resourceHTML;
            });
        }

        // Show the result container
        resultContainer.classList.remove('hidden');

        // Switch to the first tab
        switchTab('probabilities');

        // Scroll to results
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function switchTab(tabName) {
        // Update active tab button
        tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update active tab pane
        tabPanes.forEach(pane => {
            if (pane.id === tabName + '-tab') {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }

    function resetAll() {
        resetUpload();
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
    }

    function saveResults() {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.width = 800;
        canvas.height = 1200;

        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw header
        ctx.fillStyle = '#2A5C82';
        ctx.fillRect(0, 0, canvas.width, 100);

        // Draw header text
        ctx.font = 'bold 30px Poppins, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('SkinAI Analysis Results', canvas.width / 2, 60);

        // Load and draw the image
        const img = new Image();
        img.onload = function() {
            // Calculate image dimensions to maintain aspect ratio
            const maxWidth = 400;
            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            // Draw image
            const x = (canvas.width - width) / 2;
            ctx.drawImage(img, x, 130, width, height);

            // Draw prediction info
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 24px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Primary Prediction', canvas.width / 2, 480);

            ctx.font = 'bold 28px Poppins, sans-serif';
            ctx.fillStyle = '#2A5C82';
            ctx.fillText(predictionElement.textContent, canvas.width / 2, 520);

            // Draw confidence
            ctx.font = '18px Poppins, sans-serif';
            ctx.fillStyle = '#333333';
            ctx.fillText(`Confidence: ${confidenceElement.textContent}`, canvas.width / 2, 550);

            // Draw description
            ctx.font = '16px Poppins, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'left';

            // Wrap text function
            const wrapText = function(context, text, x, y, maxWidth, lineHeight) {
                const words = text.split(' ');
                let line = '';
                let testLine = '';
                let lineArray = [];

                for (let n = 0; n < words.length; n++) {
                    testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    const testWidth = metrics.width;

                    if (testWidth > maxWidth && n > 0) {
                        lineArray.push([line, x, y]);
                        line = words[n] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }

                lineArray.push([line, x, y]);
                return lineArray;
            };

            const descriptionLines = wrapText(ctx, descriptionElement.textContent, 100, 600, canvas.width - 200, 25);

            for (let i = 0; i < descriptionLines.length; i++) {
                ctx.fillText(descriptionLines[i][0], descriptionLines[i][1], descriptionLines[i][2]);
            }

            // Draw probabilities title
            ctx.font = 'bold 24px Poppins, sans-serif';
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.fillText('Class Probabilities', canvas.width / 2, 700);

            // Draw probabilities
            const predictions = Array.from(document.querySelectorAll('.probability-item'));
            let yPos = 740;

            predictions.slice(0, 5).forEach(prediction => {
                const className = prediction.querySelector('.probability-class').textContent;
                const probabilityValue = prediction.querySelector('.probability-value').textContent;

                ctx.font = '16px Poppins, sans-serif';
                ctx.fillStyle = '#333333';
                ctx.textAlign = 'left';
                ctx.fillText(className, 200, yPos);

                ctx.textAlign = 'right';
                ctx.fillText(probabilityValue, canvas.width - 200, yPos);

                // Draw probability bar background
                ctx.fillStyle = '#e0e0e0';
                ctx.fillRect(200, yPos + 10, 400, 10);

                // Draw probability bar fill
                ctx.fillStyle = '#2A5C82';
                const width = parseInt(probabilityValue) * 4; // Scale to 400px max width
                ctx.fillRect(200, yPos + 10, width, 10);

                yPos += 40;
            });

            // Draw disclaimer
            ctx.fillStyle = '#fff8e1';
            ctx.fillRect(100, 1000, canvas.width - 200, 100);

            ctx.font = 'bold 16px Poppins, sans-serif';
            ctx.fillStyle = '#856404';
            ctx.textAlign = 'center';
            ctx.fillText('Important Disclaimer', canvas.width / 2, 1030);

            ctx.font = '14px Poppins, sans-serif';
            ctx.fillText('This AI analysis is for educational purposes only and is not a medical diagnosis.', canvas.width / 2, 1060);
            ctx.fillText('Always consult a healthcare professional for medical concerns.', canvas.width / 2, 1080);

            // Draw date
            const date = new Date();
            ctx.font = '12px Poppins, sans-serif';
            ctx.fillStyle = '#999999';
            ctx.textAlign = 'right';
            ctx.fillText(`Generated on: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, canvas.width - 100, 1150);

            // Convert to image and download
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'skinai-analysis.png';
            link.href = dataUrl;
            link.click();
        };

        img.src = resultImage.src;
    }
});

// FAQ Accordion
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Toggle active class on the clicked item
            item.classList.toggle('active');

            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
        });
    });
});

