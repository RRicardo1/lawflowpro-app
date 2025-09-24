// Shared JavaScript for all pages
let userToken = null;

// API Testing Functions
async function testAPI(type) {
    try {
        let response, data;
        
        switch (type) {
            case 'classify':
                if (!userToken) {
                    // Show simple message encouraging signup
                    const banner = document.createElement('div');
                    banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#FF4F00;color:white;padding:12px 24px;border-radius:8px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
                    banner.innerHTML = '⚖️ Sign up to test AI classification on your legal emails';
                    document.body.appendChild(banner);
                    setTimeout(() => banner.remove(), 3000);
                    return;
                }
                response = await fetch('http://localhost:3001/api/ai/email/classify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({
                        subject: 'Urgent: Legal consultation needed ASAP',
                        body: 'Hi, I need immediate legal advice regarding a contract dispute.',
                        from: 'client@lawfirm.com'
                    })
                });
                break;
                
            case 'response':
                if (!userToken) {
                    const banner = document.createElement('div');
                    banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#FF4F00;color:white;padding:12px 24px;border-radius:8px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
                    banner.innerHTML = '⚖️ Sign up to test AI response generation for legal matters';
                    document.body.appendChild(banner);
                    setTimeout(() => banner.remove(), 3000);
                    return;
                }
                response = await fetch('http://localhost:3001/api/ai/email/generate-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({
                        originalSubject: 'Question about legal services for small business',
                        originalBody: 'Hi, I need some advice about my business legal requirements.',
                        from: 'business@client.com',
                        classification: 'CLIENT'
                    })
                });
                break;
                
            case 'signup':
                response = await fetch('http://localhost:3001/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: `demo${Date.now()}@example.com`,
                        password: 'DemoPass123',
                        name: 'Demo User',
                        businessName: 'Demo Law Firm',
                        businessType: 'LAW'
                    })
                });
                
                break;
                
            case 'integration':
            case 'integration-gmail':
                if (!userToken) {
                    const banner = document.createElement('div');
                    banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#FF4F00;color:white;padding:12px 24px;border-radius:8px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
                    banner.innerHTML = '📧 Sign up to connect your Gmail with secure legal integration';
                    document.body.appendChild(banner);
                    setTimeout(() => banner.remove(), 3000);
                    return;
                }
                response = await fetch('http://localhost:3001/api/integrations/connect/GMAIL', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({})
                });
                break;
                
            case 'integration-calendar':
                if (!userToken) {
                    const banner = document.createElement('div');
                    banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#FF4F00;color:white;padding:12px 24px;border-radius:8px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
                    banner.innerHTML = '📅 Sign up to sync your legal calendar and court dates';
                    document.body.appendChild(banner);
                    setTimeout(() => banner.remove(), 3000);
                    return;
                }
                response = await fetch('http://localhost:3001/api/integrations/connect/GOOGLE_CALENDAR', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({})
                });
                break;
                
            case 'integration-quickbooks':
                if (!userToken) {
                    const banner = document.createElement('div');
                    banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#FF4F00;color:white;padding:12px 24px;border-radius:8px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
                    banner.innerHTML = '💰 Sign up to connect your legal billing and time tracking';
                    document.body.appendChild(banner);
                    setTimeout(() => banner.remove(), 3000);
                    return;
                }
                response = await fetch('http://localhost:3001/api/integrations/connect/QUICKBOOKS', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({})
                });
                break;
                
            case 'integration-outlook':
                if (!userToken) {
                    alert('Please sign up first to test integrations!');
                    return;
                }
                response = await fetch('http://localhost:3001/api/integrations/connect/OUTLOOK', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({})
                });
                break;
        }
        
        if (response) {
            data = await response.json();
            
            // Handle signup success
            if (type === 'signup' && response.ok && data.success && data.data.accessToken) {
                userToken = data.data.accessToken;
                alert('✅ Account created! You can now test AI features.');
            }
            
            showModal(JSON.stringify(data, null, 2));
        }
        
    } catch (error) {
        showModal(`Error: ${error.message}`);
    }
}

// Modal functions
function showModal(content) {
    document.getElementById('response-content').textContent = content;
    document.getElementById('api-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('api-modal').style.display = 'none';
}

// Professional demo modal for clients
function showProfessionalDemo(title, features, description, ctaText = "Sign up to get started") {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    `;
    closeBtn.onclick = () => modal.remove();
    
    const featuresHtml = features.map(feature => `
        <div style="display: flex; align-items: center; margin: 12px 0;">
            <span style="color: #10B981; margin-right: 12px; font-size: 18px;">✓</span>
            <span>${feature.replace('✅ ', '')}</span>
        </div>
    `).join('');
    
    content.innerHTML = `
        <div style="text-align: center;">
            <h2 style="color: #FF4F00; margin-bottom: 20px; font-size: 28px;">${title}</h2>
            <p style="color: #666; margin-bottom: 30px; font-size: 16px;">${description}</p>
            
            <div style="text-align: left; margin: 30px 0;">
                ${featuresHtml}
            </div>
            
            <button onclick="realSignup(); this.closest('.modal').remove();" 
                    style="background: #FF4F00; color: white; border: none; padding: 16px 32px; 
                           border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; 
                           margin-top: 20px; width: 100%;">
                ${ctaText}
            </button>
            
            <p style="color: #999; font-size: 14px; margin-top: 15px;">
                First month free • No credit card required
            </p>
        </div>
    `;
    
    content.appendChild(closeBtn);
    modal.appendChild(content);
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Production signup function - redirect to signup page
function realSignup() {
    // Redirect to login page with signup focus
    window.location.href = 'login.html?signup=true';
}

// Animate counter function
function animateCounter(id, target, suffix = '') {
    const element = document.getElementById(id);
    if (!element) return;
    
    const duration = 2000;
    const steps = 50;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.floor(current) + suffix;
        
        if (current >= target) {
            element.textContent = target + suffix;
            clearInterval(timer);
        }
    }, duration / steps);
}

// Set active navigation
function setActiveNav(page) {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === page) {
            link.classList.add('active');
        }
    });
}