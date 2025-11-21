// TTravels AI Assistant Widget - Enhanced with Voice & Multilingual Support
(function() {
  // Global state
  let conversationId = 'default_' + Date.now();
  let isListening = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let audioContext = null;
  
  // Inject enhanced styles
  const style = document.createElement('style');
  style.textContent = `
    .voice-assistant-button {
      position: fixed; bottom: 24px; right: 24px; cursor: pointer; z-index: 9999; transition: all 0.3s ease;
    }
    .voice-assistant-button::before {
      content: ''; position: absolute; inset: -4px; border-radius: 50%; background: linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(16, 185, 129, 0.2)); z-index: -1; animation: pulse 2s infinite;
    }
    .voice-assistant-modal {
      position: fixed; bottom: 90px; right: 24px; width: 420px; height: 650px; border-radius: 24px; background: rgba(255,255,255,0.98); backdrop-filter: blur(16px); box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; z-index: 9999; transform-origin: bottom right; transform: scale(0); opacity: 0; transition: all 0.4s cubic-bezier(0.175,0.885,0.32,1.275); overflow: hidden; border: 1px solid rgba(229,231,235,0.5);
    }
    .voice-assistant-modal.active { transform: scale(1); opacity: 1; }
    .chat-container { flex: 1; overflow-y: auto; padding: 16px; }
    .message { margin-bottom: 16px; max-width: 80%; padding: 12px 16px; border-radius: 16px; line-height: 1.4; }
  .user-message { background-color: #4f46e5; color: white; margin-left: auto; border-bottom-right-radius: 4px; }
  .assistant-message { background-color: #f3f4f6; color: #1f2937; margin-right: auto; border-bottom-left-radius: 4px; overflow: visible; }
    .result-card { background-color: white; border-radius: 12px; padding: 12px; margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .waveform-container { height: 60px; display: flex; align-items: center; justify-content: center; }
    .waveform { display: flex; align-items: center; justify-content: center; height: 100%; }
    .waveform-bar { width: 4px; margin: 0 2px; background: linear-gradient(to bottom, #4f46e5, #10b981); border-radius: 2px; }
    .listening-indicator { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); background-color: rgba(0,0,0,0.7); color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; opacity: 0; transition: opacity 0.3s ease; }
    .listening .listening-indicator { opacity: 1; }
    .ripple { position: absolute; border-radius: 50%; background: rgba(79,70,229,0.2); transform: scale(0); animation: ripple 1.5s linear infinite; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 0.3; } 100% { transform: scale(1); opacity: 0.7; } }
    @keyframes ripple { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
    .quick-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .quick-action-button { background-color: #f3f4f6; color: #1f2937; border-radius: 16px; padding: 6px 12px; font-size: 14px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
    .quick-action-button:hover { background-color: #e5e7eb; }
    .suggestion-chips { display: flex; gap: 8px; overflow-x: auto; padding: 8px 0; scrollbar-width: none; }
    .suggestion-chips::-webkit-scrollbar { display: none; }
    .suggestion-chip { background-color: #f3f4f6; color: #1f2937; border-radius: 16px; padding: 6px 12px; font-size: 14px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; }
    .suggestion-chip:hover { background-color: #e5e7eb; }
    .input-container { position: relative; }
    .input-field { width: 100%; padding: 12px 50px 12px 16px; border-radius: 24px; border: 1px solid #e5e7eb; outline: none; background-color: white; font-size: 14px; }
    .input-field:focus { border-color: #4f46e5; }
    .send-button { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .send-button:hover { background-color: #4338ca; }
    .language-selector { position: absolute; top: 8px; right: 8px; }
    .language-select { padding: 4px 8px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 12px; background: white; }
    .voice-controls { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
    .voice-button { width: 40px; height: 40px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .voice-button:hover { background: #4338ca; }
    .voice-button.listening { background: #ef4444; animation: pulse 1s infinite; }
    .voice-button.speaking { background: #10b981; }
    .notification-badge { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }
    .typing-indicator { display: flex; align-items: center; gap: 4px; padding: 8px 16px; color: #6b7280; font-size: 14px; }
    .typing-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b7280; animation: typing 1.4s infinite; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-10px); } }
    
    .voice-assistant-button > div {
      width: 56px;
      height: 56px;
      background: #fff;
      border-radius: 50%;
      border: 3px solid #3b82f6;
      box-shadow: 0 4px 16px rgba(59,130,246,0.15), 0 1.5px 4px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .voice-assistant-button > div:hover {
      box-shadow: 0 8px 24px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.12);
      transform: scale(1.07);
    }

    /* Add this inside your <style> tag */
    .trip-plan-card {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      margin: 12px 10px; /* leave a small gap from the modal edges */
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      overflow: visible; /* allow internal shadows to show */
      max-width: calc(100% - 20px);
      box-sizing: border-box;
    }

.trip-plan-header {
  padding: 12px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.trip-plan-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
}

.trip-plan-body {
  padding: 16px;
}

.trip-plan-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
}

.trip-plan-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.trip-plan-item-content h5 {
  font-weight: 500;
  color: #374151;
}

.trip-plan-item-content p {
  font-size: 14px;
  color: #6b7280;
}

.itinerary-day {
  margin-bottom: 10px;
}

.itinerary-day strong {
  color: #1f2937;
}

.book-now-btn {
  display: inline-block;
  background-color: #4f46e5;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  text-decoration: none;
  margin-top: 10px;
  transition: background-color 0.2s;
}

.book-now-btn:hover {
  background-color: #4338ca;
}
  `;
  document.head.appendChild(style);

  // Inject enhanced HTML
  const root = document.getElementById('ai-assistant-root');
  if (!root) return;
  root.innerHTML = `
    <div class="voice-assistant-button shadow-lg hover:shadow-xl transition-shadow" id="voiceAssistantButton">
      <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center">
        <i class="ri-mic-line text-xl text-primary"></i>
      </div>
      <div class="listening-indicator">Listening...</div>
      <div class="notification-badge" id="notificationBadge" style="display: none;">0</div>
    </div>
    <div class="voice-assistant-modal" id="voiceAssistantModal">
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3">
            <i class="ri-robot-line text-white"></i>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">TTravels Assistant</h3>
            <span class="text-xs text-green-500" id="statusIndicator">Active</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <!-- language selector removed — chatbot uses single language pipeline by default -->
          <button class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700" id="minimizeButton"><i class="ri-subtract-line"></i></button>
          <button class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700" id="closeButton"><i class="ri-close-line"></i></button>
        </div>
      </div>
      <div class="chat-container" id="chatContainer"></div>
      <div class="waveform-container" id="waveformContainer" style="display: none;">
        <div class="waveform" id="waveform">
          <div class="waveform-bar" style="height: 15px;"></div>
          <div class="waveform-bar" style="height: 25px;"></div>
          <div class="waveform-bar" style="height: 35px;"></div>
          <div class="waveform-bar" style="height: 45px;"></div>
          <div class="waveform-bar" style="height: 35px;"></div>
          <div class="waveform-bar" style="height: 25px;"></div>
          <div class="waveform-bar" style="height: 15px;"></div>
        </div>
      </div>
      <div class="p-4 border-t border-gray-200">
        <div class="suggestion-chips" id="suggestionChips">
          <button class="suggestion-chip"><i class="ri-flight-takeoff-line mr-1"></i> Book a flight</button>
          <button class="suggestion-chip"><i class="ri-hotel-line mr-1"></i> Find hotels</button>
          <button class="suggestion-chip"><i class="ri-map-pin-line mr-1"></i> Places to visit</button>
          <button class="suggestion-chip"><i class="ri-ticket-2-line mr-1"></i> Track my booking</button>
        </div>
        <div class="input-container mt-3">
          <input type="text" class="input-field" placeholder="Type your message..." id="messageInput">
          <button class="send-button" id="sendButton"><i class="ri-send-plane-fill"></i></button>
        </div>
        <div class="voice-controls">
          <button class="voice-button" id="micButton" title="Voice Input">
            <i class="ri-mic-line"></i>
          </button>
          <button class="voice-button" id="speakerButton" title="Text-to-Speech" style="display: none;">
            <i class="ri-volume-up-line"></i>
          </button>
          <button class="voice-button" id="stopButton" title="Stop" style="display: none;">
            <i class="ri-stop-line"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  // Enhanced API functions
  async function callEnhancedChat(message) {
    try {
      const response = await fetch('/api/chat-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message, 
          conversation_id: conversationId 
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Enhanced chat error:', error);
      return { error: 'Failed to get response' };
    }
  }

  // Event delegation to handle Save button clicks on trip plan cards
  

  async function callVoiceChat(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('conversation_id', conversationId);
            
      const response = await fetch('/api/chat-voice', {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch (error) {
      console.error('Voice chat error:', error);
      return { error: 'Voice chat failed' };
    }
  }

  async function callTextToSpeech(text) {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return await response.json();
    } catch (error) {
      console.error('TTS error:', error);
      return { error: 'TTS failed' };
    }
  }

  async function getNotifications() {
    try {
      const response = await fetch('/api/notifications');
      return await response.json();
    } catch (error) {
      console.error('Notifications error:', error);
      return { notifications: [] };
    }
  }

  // DOM elements
  const voiceButton = document.getElementById('voiceAssistantButton');
  const modal = document.getElementById('voiceAssistantModal');
  const minimizeButton = document.getElementById('minimizeButton');
  const closeButton = document.getElementById('closeButton');
  const chatContainer = document.getElementById('chatContainer');
  const waveformContainer = document.getElementById('waveformContainer');
  const waveform = document.getElementById('waveform');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const micButton = document.getElementById('micButton');
  const speakerButton = document.getElementById('speakerButton');
  const stopButton = document.getElementById('stopButton');
  const statusIndicator = document.getElementById('statusIndicator');
  const notificationBadge = document.getElementById('notificationBadge');
  const suggestionChips = document.getElementById('suggestionChips');

  // Enhanced chat functions
  // Event delegation to handle Save button clicks, hotel/flight selection on trip plan cards
  chatContainer.addEventListener('click', function(evt) {
    // Handle hotel selection
    const hotelBtn = evt.target.closest('.select-hotel-btn');
    if (hotelBtn) {
      const card = hotelBtn.closest('.trip-plan-card');
      if (!card) return;
      
      const scriptTag = card.querySelector('.trip-plan-json');
      if (!scriptTag) {
        alert('Trip plan data not available.');
        return;
      }
      
      let planObj = null;
      try {
        planObj = JSON.parse(scriptTag.textContent);
      } catch (err) {
        console.error('Failed to parse trip plan JSON:', err);
        alert('Failed to read trip plan.');
        return;
      }
      
      const hotelIndex = parseInt(hotelBtn.getAttribute('data-hotel-index'), 10);
      if (isNaN(hotelIndex) || !planObj.hotels || !planObj.hotels[hotelIndex]) {
        alert('Invalid hotel selection.');
        return;
      }
      
      // Update selected hotel
      planObj.selected_hotel = planObj.hotels[hotelIndex];
      
      // Update the JSON in the script tag
      scriptTag.textContent = JSON.stringify(planObj).replace(/</g, '\u003c');
      
      // Re-render the trip plan card
      const tripPlanHtml = renderTripPlan(planObj);
      card.outerHTML = tripPlanHtml;
      
      // Show success message
      addMessage('Hotel selected! It will be saved when you save the trip plan.', false, false);
      return;
    }
    
    // Handle flight selection
    const flightBtn = evt.target.closest('.select-flight-btn');
    if (flightBtn) {
      const card = flightBtn.closest('.trip-plan-card');
      if (!card) return;
      
      const scriptTag = card.querySelector('.trip-plan-json');
      if (!scriptTag) {
        alert('Trip plan data not available.');
        return;
      }
      
      let planObj = null;
      try {
        planObj = JSON.parse(scriptTag.textContent);
      } catch (err) {
        console.error('Failed to parse trip plan JSON:', err);
        alert('Failed to read trip plan.');
        return;
      }
      
      const flightIndex = parseInt(flightBtn.getAttribute('data-flight-index'), 10);
      if (isNaN(flightIndex) || !planObj.flights || !planObj.flights[flightIndex]) {
        alert('Invalid flight selection.');
        return;
      }
      
      // Update selected flight
      planObj.selected_flight = planObj.flights[flightIndex];
      
      // Update the JSON in the script tag
      scriptTag.textContent = JSON.stringify(planObj).replace(/</g, '\u003c');
      
      // Re-render the trip plan card
      const tripPlanHtml = renderTripPlan(planObj);
      card.outerHTML = tripPlanHtml;
      
      // Show success message
      addMessage('Flight selected! It will be saved when you save the trip plan.', false, false);
      return;
    }
    
    // Handle Save button
    const btn = evt.target.closest('.save-trip-plan-btn');
    if (!btn) return;

    // Find the trip-plan-card container
    const card = btn.closest('.trip-plan-card');
    if (!card) return;

    const scriptTag = card.querySelector('.trip-plan-json');
    if (!scriptTag) {
      alert('Trip plan data not available to save.');
      return;
    }

    let planObj = null;
    try {
      planObj = JSON.parse(scriptTag.textContent);
    } catch (err) {
      console.error('Failed to parse trip plan JSON:', err);
      alert('Failed to read trip plan.');
      return;
    }

    // Disable button while saving
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';

    // POST to server (include credentials so cookies/session are sent)
    fetch('/api/save-trip-plan', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: (planObj.details && planObj.details.destination) || '', trip_plan: planObj })
    }).then(async (res) => {
      if (res.status === 401) {
        // Not logged in — redirect to login or prompt
        btn.disabled = false;
        btn.textContent = originalText;
        if (confirm('You must be logged in to save trip plans. Log in now?')) {
          window.location = '/login';
        }
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // Show success feedback on the card
        const okBadge = document.createElement('div');
        okBadge.style.marginTop = '8px';
        okBadge.style.color = '#065f46';
        okBadge.style.fontWeight = '600';
        okBadge.textContent = 'Saved to your plans ✅';
        card.querySelector('.trip-plan-body').appendChild(okBadge);
        btn.textContent = 'Saved';
        btn.disabled = true;
      } else {
        const errMsg = (data && data.error) ? data.error : 'Failed to save trip plan';
        alert(errMsg);
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }).catch(err => {
      console.error('Save trip plan request failed:', err);
      alert('Unable to save plan at the moment.');
      btn.disabled = false;
      btn.textContent = originalText;
    });
  });

  function saveChatHistory() {
    localStorage.setItem('ttravels_chat_history', chatContainer.innerHTML);
    localStorage.setItem('ttravels_conversation_id', conversationId);
  }

  function loadChatHistory() {
    const history = localStorage.getItem('ttravels_chat_history');
    const savedConversationId = localStorage.getItem('ttravels_conversation_id');
    
    if (savedConversationId) {
      conversationId = savedConversationId;
    }
    
    if (history) {
      chatContainer.innerHTML = history;
    } else {
      // Initial greeting
      addMessage(`<p>👋 Hi there! I'm your TTravels Assistant. How can I help you today?</p><div class=\"quick-actions\"><button class=\"quick-action-button\"><i class=\"ri-search-line mr-1\"></i> Search by Voice</button><button class=\"quick-action-button\"><i class=\"ri-compass-3-line mr-1\"></i> Travel Suggestions</button><button class=\"quick-action-button\"><i class=\"ri-ticket-2-line mr-1\"></i> Manage Bookings</button></div>`, false, true);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant-message typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span style="margin-left: 8px;">Assistant is typing...</span>
    `;
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  function playAudio(audioBase64) {
    if (!audioBase64) return;

    try {
      console.debug('playAudio called, payload length:', (''+audioBase64).length);

      // If the backend returned a data URI, detect mime and strip prefix
      let b64 = audioBase64;
      let mime = 'audio/mpeg'; // default fallback

      const m = String(b64).match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        mime = m[1];
        b64 = m[2];
        console.debug('Detected data URI mime:', mime);
      } else {
        // Remove whitespace/newlines that may break atob
        b64 = b64.replace(/\s+/g, '');
        console.debug('No data URI prefix; using fallback mime:', mime);
      }

      // atob decoding
      const binary = atob(b64);
      const len = binary.length;
      const audioArray = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        audioArray[i] = binary.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: mime });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      speakerButton.classList.add('speaking');
      audio.onended = () => {
        speakerButton.classList.remove('speaking');
        URL.revokeObjectURL(audioUrl);
      };

      // Play and handle promise rejection
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          console.debug('Audio playback started successfully');
        }).catch(err => {
          console.error('Audio play promise rejected:', err);
          speakerButton.classList.remove('speaking');
          URL.revokeObjectURL(audioUrl);
        });
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }

  function updateNotificationBadge() {
    getNotifications().then(data => {
      const unreadCount = data.notifications?.filter(n => !n.read).length || 0;
      if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = 'flex';
      } else {
        notificationBadge.style.display = 'none';
      }
    });
  }

  // Enhanced event listeners
  voiceButton.addEventListener('click', function() {
    modal.classList.add('active');
    updateNotificationBadge();
  });
  
  minimizeButton.addEventListener('click', function() {
    modal.classList.remove('active');
  });
  
  closeButton.addEventListener('click', function() {
    modal.classList.remove('active');
  });

  // Language selection
  // language selector removed — no-op

  // Ripple effect
  voiceButton.addEventListener('mousedown', function(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    button.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 1500);
  });

  // Enhanced voice recognition
  micButton.addEventListener('click', function() {
    if (isListening) {
      stopRecording();
      return;
    }
    
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      addMessage("Audio recording not supported in this browser.", false, false);
      return;
    }
    
    startRecording();
  });

  function startRecording() {
    isListening = true;
    micButton.classList.add('listening');
    voiceButton.classList.add('listening');
    waveformContainer.style.display = 'flex';
    chatContainer.style.display = 'none';
    animateWaveform();
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = function(e) {
          audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = function() {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          processVoiceInput(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        
        // Auto-stop after 5 seconds
        setTimeout(() => {
          if (isListening) {
            stopRecording();
          }
        }, 5000);
      })
      .catch(function(error) {
        console.error('Microphone access error:', error);
        stopRecording();
        addMessage("Microphone access denied. Please allow microphone access to use voice features.", false, false);
      });
  }

  function stopRecording() {
    isListening = false;
    micButton.classList.remove('listening');
    voiceButton.classList.remove('listening');
    waveformContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }

  async function processVoiceInput(audioBlob) {
    try { 
      showTypingIndicator();
      
  const response = await callVoiceChat(audioBlob);
      
      hideTypingIndicator();
      
      if (response.error) {
        addMessage(`Error: ${response.error}`, false, false);
        return;
      }
      
      // Handling moved to a single replacement block below to avoid duplicates

        // --- REPLACEMENT BLOCK ---
      // Add user message
      if (response.transcribed_text) {
        addMessage(response.transcribed_text, true, false);
      }

      // Add assistant text summary
          if (response.reply_text) {
            // Assistant reply text: render as trusted Markdown/HTML
            addMessage(response.reply_text, false, true);
          }

      // ** NEW ** Check for and render the trip plan (defensive lookup)
      const tripPlan = response.trip_plan || (response.response_data && response.response_data.trip_plan);
      if (tripPlan) {
        const tripPlanHtml = renderTripPlan(tripPlan);
        addMessage(tripPlanHtml, false, true); // Add the HTML as a new message bubble
      }

      // ** NEW ** Check for hotel results and render interactive hotel cards
      const hotelResults = response.hotel_results || (response.response_data && response.response_data.hotel_results);
      if (Array.isArray(hotelResults) && hotelResults.length > 0) {
        const hotelCardsHtml = renderHotelCards(hotelResults);
        if (hotelCardsHtml) addMessage(hotelCardsHtml, false, true);
      }

      // Play audio if available
      if (response.audio) {
        playAudio(response.audio);
      }

      // Update suggestions if available
      if (response.response_data?.suggestions) {
        updateSuggestions(response.response_data.suggestions);
      }
      // --- END OF REPLACEMENT BLOCK ---
    } catch (error) {
      hideTypingIndicator();
      console.error('Voice processing error:', error);
      addMessage("Sorry, there was an error processing your voice.", false, false);
    }
  }
  // Enhanced message handling
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  // Text-to-Speech button
  speakerButton.addEventListener('click', function() {
    const lastMessage = chatContainer.querySelector('.assistant-message:last-child');
    if (lastMessage) {
      const text = lastMessage.textContent.trim();
      if (text) {
  callTextToSpeech(text).then(data => {
          if (data.audio) {
            playAudio(data.audio);
          }
        });
      }
    }
  });

  // Stop button
  stopButton.addEventListener('click', function() {
    // Stop any ongoing audio
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => audio.pause());
    speakerButton.classList.remove('speaking');
  });

  // Enhanced suggestion chips
  function updateSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return;
    
    suggestionChips.innerHTML = '';
    suggestions.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        sendMessage(suggestion);
      });
      suggestionChips.appendChild(chip);
    });
  }

  // Enhanced send message logic
  async function sendMessage(text = null) {
    const message = text || messageInput.value.trim();
    if (!message) return;
    
    if (!text) {
      messageInput.value = '';
    }
    
  addMessage(message, true, false);
    showTypingIndicator();
    
    try {
  const response = await callEnhancedChat(message);
      hideTypingIndicator();
      
      if (response.error) {
        addMessage(`Error: ${response.error}`, false, false);
        return;
      }

      // Unified assistant response handling (avoid duplicates)
      // Prefer the canonical keys: reply, reply_text
      const replyText = response.reply || response.reply_text || response.reply_text || '';

      if (replyText) {
        // Assistant reply: render Markdown/HTML
        addMessage(replyText, false, true);
      }

      // Defensive trip_plan lookup (top-level or nested)
      const tripPlan = response.trip_plan || (response.response_data && response.response_data.trip_plan);
      if (tripPlan) {
        const tripPlanHtml = renderTripPlan(tripPlan);
        addMessage(tripPlanHtml, false, true);
      }

      // ** NEW ** Check for hotel results and render interactive hotel cards
      const hotelResults = response.hotel_results || (response.response_data && response.response_data.hotel_results);
      if (Array.isArray(hotelResults) && hotelResults.length > 0) {
        const hotelCardsHtml = renderHotelCards(hotelResults);
        if (hotelCardsHtml) addMessage(hotelCardsHtml, false, true);
      }

      // Play audio if available
      if (response.audio) {
        playAudio(response.audio);
      }

      // Update suggestions if present
      if (response.response_data?.suggestions) {
        updateSuggestions(response.response_data.suggestions);
      }

      // Quick actions and booking actions (if provided)
      if (response.response_data?.quick_actions) {
        showQuickActions(response.response_data.quick_actions);
      }
      if (response.response_data?.booking_actions) {
        showBookingActions(response.response_data.booking_actions);
      }
      
    } catch (error) {
      hideTypingIndicator();
      console.error('Send message error:', error);
      addMessage("Sorry, there was an error contacting the assistant.", false, false);
    }
  }

  // Bind send button click without passing the event object into sendMessage
  // (passing the event caused PointerEvent to be used as the message)
  sendButton.removeEventListener('click', sendMessage);
  sendButton.addEventListener('click', () => sendMessage());

  // Add message to chat
  function addMessage(content, isUser, isHtml = false) {
    // De-duplicate identical assistant messages appearing back-to-back.
    if (!isUser) {
      const lastAssistant = chatContainer.querySelector('.assistant-message:last-child');
      if (lastAssistant) {
        try {
          let lastText = lastAssistant.textContent && lastAssistant.textContent.trim();
          let newText = '';
          if (isHtml) {
            // If content is HTML (trip plan card etc.) or Markdown, convert to plain text for comparison
            let htmlToParse = String(content);
            // If marked is available and content looks like markdown (no tags), render to HTML first
            const hasHtmlTags = /<[a-z][\s\S]*>/i.test(htmlToParse);
            if (!hasHtmlTags && window.marked) {
              htmlToParse = window.marked.parse(htmlToParse);
            }
            newText = (new DOMParser().parseFromString(htmlToParse, 'text/html')).body.textContent.trim();
          } else {
            newText = String(content).trim();
          }

          if (lastText === newText && newText !== '') {
            // Skip adding duplicate assistant message
            return;
          }
        } catch (e) {
          // If parsing fails, continue and add the message to avoid dropping content
          console.debug('Dedupe parse failed, adding message', e);
        }
      }
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (isUser) messageDiv.classList.add('user-message');
    else messageDiv.classList.add('assistant-message');

    if (isUser) {
      // Always render user input as plain text to avoid XSS
      messageDiv.textContent = content;
    } else if (isHtml) {
      // Assistant content: either trusted HTML (trip plan card) or Markdown
      try {
        const looksLikeHtml = /<[a-z][\s\S]*>/i.test(String(content));
        if (looksLikeHtml) {
          // Insert trusted HTML directly (trip plan cards are already escaped where needed)
          messageDiv.innerHTML = content;
        } else if (window.marked && typeof window.marked.parse === 'function') {
          // Render Markdown to HTML
          messageDiv.innerHTML = window.marked.parse(String(content));
        } else {
          // Fallback: insert as HTML (if caller provided safe HTML) or plain text
          messageDiv.innerHTML = String(content);
        }
      } catch (err) {
        console.error('Failed to render assistant content:', err);
        messageDiv.textContent = String(content);
      }
    } else {
      // Assistant plain-text message
      messageDiv.textContent = content;
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    saveChatHistory();
  }

  // Show quick actions
  function showQuickActions(actions) {
    const quickActionsDiv = document.createElement('div');
    quickActionsDiv.className = 'quick-actions';
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'quick-action-button';
      button.innerHTML = `<i class="${action.icon} mr-1"></i> ${action.text}`;
      button.addEventListener('click', () => {
        if (action.action === 'book') {
          // Handle booking action
          sendMessage(`I want to ${action.text.toLowerCase()}`);
        } else {
          sendMessage(action.text);
        }
      });
      quickActionsDiv.appendChild(button);
    });
    
    // Add to last assistant message
    const lastMessage = chatContainer.querySelector('.assistant-message:last-child');
    if (lastMessage) {
      lastMessage.appendChild(quickActionsDiv);
    }
  }

  // Show booking actions
  function showBookingActions(actions) {
    const bookingActionsDiv = document.createElement('div');
    bookingActionsDiv.className = 'quick-actions';
    bookingActionsDiv.style.marginTop = '8px';
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'quick-action-button';
      button.style.backgroundColor = '#4f46e5';
      button.style.color = 'white';
      button.innerHTML = `<i class="${action.icon} mr-1"></i> ${action.text}`;
      button.addEventListener('click', () => {
        if (action.url) {
          window.open(action.url, '_blank');
        } else {
          sendMessage(action.text);
        }
      });
      bookingActionsDiv.appendChild(button);
    });
    
    // Add to last assistant message
    const lastMessage = chatContainer.querySelector('.assistant-message:last-child');
    if (lastMessage) {
      lastMessage.appendChild(bookingActionsDiv);
    }
  }

  // Animate waveform
  function animateWaveform() {
    const bars = waveform.querySelectorAll('.waveform-bar');
    function randomHeight() { return Math.floor(Math.random() * 40) + 5 + 'px'; }
    const interval = setInterval(() => {
      bars.forEach(bar => {
        bar.style.height = randomHeight();
        bar.style.transition = 'height 0.2s ease';
      });
    }, 200);
    setTimeout(() => { clearInterval(interval); }, 5000);
  }

  // Initialize
  loadChatHistory();
  updateNotificationBadge();
  
  // Update notifications every 30 seconds
  setInterval(updateNotificationBadge, 30000);

  // Add this new function to ai-assistant.js
  function renderTripPlan(plan) {
  if (!plan || !plan.details) {
    return ''; // Return an empty string if the plan is invalid
  }

  // Defensive unpacking
  const details = plan.details || {};
  const flights = Array.isArray(plan.flights) ? plan.flights : [];
  const hotels = Array.isArray(plan.hotels) ? plan.hotels : [];
  const attractions = Array.isArray(plan.attractions) ? plan.attractions : [];
  const itinerary_object = plan.itinerary_object || {};
  // Use itinerary_object.summary if available, otherwise fall back to itinerary_text
  let itinerary_text = (itinerary_object.summary || plan.itinerary_text || plan.itinerary || '') + '';
  
  // If itinerary_text is empty but day_by_day exists, build text from day_by_day
  if (!itinerary_text.trim() && itinerary_object.day_by_day && Array.isArray(itinerary_object.day_by_day) && itinerary_object.day_by_day.length > 0) {
    const dayParts = [];
    for (const day of itinerary_object.day_by_day) {
      if (day && typeof day === 'object') {
        const dayNum = day.day || '';
        const title = day.title || '';
        const details = day.details || '';
        let dayStr = `Day ${dayNum}`;
        if (title) dayStr += `: ${title}`;
        if (details) dayStr += `\n${details}`;
        dayParts.push(dayStr);
      }
    }
    if (dayParts.length > 0) {
      itinerary_text = dayParts.join('\n\n');
    }
  }
  
  // Final fallback if still empty
  if (!itinerary_text.trim()) {
    itinerary_text = `Here's your ${details.days || ''}-day trip plan to ${details.destination || 'your destination'}.`;
  }

  // --- Flight Card HTML (Show all options) ---
  let flightCard = '';
  if (flights.length > 0 && !flights.error) {
    const selectedFlight = plan.selected_flight || null;
    const flightsList = flights.slice(0, 5).map((flight, index) => {
      const airline = flight.airline || flight.airline_name || flight.airline?.name || 'Flight';
      const origin = flight.origin || flight.departure_airport?.id || flight.departure || 'Origin';
      const destination = flight.destination || flight.arrival_airport?.id || flight.arrival || 'Destination';
      const price = flight.price || flight.amount || flight.local_prices?.[0]?.price || 'N/A';
      const total_duration = flight.total_duration || flight.duration || '';
      const departure_time = flight.departure_time || flight.departure_airport?.time || '';
      const arrival_time = flight.arrival_time || flight.arrival_airport?.time || '';
      const isSelected = selectedFlight && selectedFlight.airline === airline && selectedFlight.price === price;
      
      return `
        <div class="border border-gray-200 rounded-lg p-3 mb-2 ${isSelected ? 'ring-2 ring-primary-600 bg-primary-50' : 'hover:bg-gray-50'}">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h6 class="font-semibold text-gray-900">${escapeHtml(airline)}</h6>
              <p class="text-sm text-gray-600">${escapeHtml(String(origin))} → ${escapeHtml(String(destination))}</p>
              ${departure_time ? `<p class="text-xs text-gray-500">Departure: ${escapeHtml(String(departure_time))}</p>` : ''}
              ${arrival_time ? `<p class="text-xs text-gray-500">Arrival: ${escapeHtml(String(arrival_time))}</p>` : ''}
              ${total_duration ? `<p class="text-xs text-gray-500">Duration: ${escapeHtml(String(total_duration))}</p>` : ''}
              <p class="text-sm font-semibold text-primary-600 mt-1">₹${escapeHtml(String(price))} ${flight.currency || ''}</p>
            </div>
            <div class="ml-3">
              ${isSelected ? `
                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Selected</span>
              ` : `
                <button class="select-flight-btn bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors" data-flight-index="${index}">
                  Select
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    flightCard = `
      <div class="trip-plan-item">
        <div class="trip-plan-item-icon"><i class="ri-flight-takeoff-line"></i></div>
        <div class="trip-plan-item-content">
          <h5>Flight Options (${flights.length})</h5>
          <div style="max-height: 300px; overflow-y: auto; margin-top: 8px;">
            ${flightsList}
          </div>
        </div>
      </div>
    `;
  }

  // --- Hotel Card HTML (Show all options with selection) ---
  let hotelCard = '';
  if (hotels.length > 0 && !hotels.error) {
    const selectedHotel = plan.selected_hotel || null;
    const hotelsList = hotels.map((hotel, index) => {
      const hotelName = hotel.name || hotel.title || 'Hotel';
      const hotelPrice = hotel.price || hotel.rate || hotel.lowest_price || 'N/A';
      const hotelRating = hotel.rating || hotel.star_rating || '';
      const address = hotel.address || hotel.vicinity || '';
      const reviews = hotel.reviews || '';
      const isSelected = selectedHotel && (selectedHotel.name === hotelName || selectedHotel.title === hotelName);
      
      return `
        <div class="border border-gray-200 rounded-lg p-3 mb-2 ${isSelected ? 'ring-2 ring-primary-600 bg-primary-50' : 'hover:bg-gray-50'}">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h6 class="font-semibold text-gray-900">${escapeHtml(hotelName)}</h6>
              ${hotelRating ? `<p class="text-sm text-gray-600">⭐ ${escapeHtml(String(hotelRating))} ${reviews ? `(${escapeHtml(String(reviews))} reviews)` : ''}</p>` : ''}
              ${address ? `<p class="text-xs text-gray-500">${escapeHtml(address)}</p>` : ''}
              <p class="text-sm font-semibold text-primary-600 mt-1">${escapeHtml(String(hotelPrice))}</p>
            </div>
            <div class="ml-3">
              ${isSelected ? `
                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Selected</span>
              ` : `
                <button class="select-hotel-btn bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors" data-hotel-index="${index}">
                  Select
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    hotelCard = `
      <div class="trip-plan-item">
        <div class="trip-plan-item-icon"><i class="ri-hotel-line"></i></div>
        <div class="trip-plan-item-content">
          <h5>Hotel Options (${hotels.length})</h5>
          <p class="text-xs text-gray-500 mb-2">Select a hotel to add to your trip plan</p>
          <div style="max-height: 300px; overflow-y: auto; margin-top: 8px;">
            ${hotelsList}
          </div>
        </div>
      </div>
    `;
  }

  // --- Attractions Card HTML ---
  let attractionsCard = '';
  if (attractions.length > 0 && !attractions.error) {
    const attractionsList = attractions.slice(0, 5).map(attr => {
      const name = attr.name || attr.title || 'Attraction';
      const rating = attr.rating || '';
      const address = attr.address || '';
      return `
        <div style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 8px;">
          <strong>${escapeHtml(name)}</strong>
          ${rating ? `<span style="color: #6b7280; font-size: 12px;"> ⭐ ${escapeHtml(String(rating))}</span>` : ''}
          ${address ? `<p style="font-size: 12px; color: #6b7280; margin-top: 4px;">${escapeHtml(address)}</p>` : ''}
        </div>
      `;
    }).join('');

    attractionsCard = `
      <div class="trip-plan-item">
        <div class="trip-plan-item-icon"><i class="ri-map-pin-line"></i></div>
        <div class="trip-plan-item-content">
          <h5>Top Attractions to Visit</h5>
          <div style="max-height: 200px; overflow-y: auto;">
            ${attractionsList}
          </div>
        </div>
      </div>
    `;
  }

  // --- Itinerary HTML ---
  // safely format itinerary text
  const formattedItinerary = escapeHtml(itinerary_text)
    .replace(/\n/g, '<br>')
    .replace(/(Day \d+:)/gm, '<strong>$1</strong>');

  // --- Final Assembled Card ---
  return `
    <div class="trip-plan-card">
      <div class="trip-plan-header">
        <h4 style="display:flex;align-items:center;justify-content:space-between;"><span><i class="ri-map-pin-2-line" style="margin-right: 8px;"></i> Your Trip to ${escapeHtml(details.destination || 'your destination')}</span>
          <span>
            <button class="book-now-btn save-trip-plan-btn" style="background:#10b981;margin-right:8px;">Save</button>
            <a href="/dashboard" class="book-now-btn" style="background:#4f46e5;">View Dashboard</a>
          </span>
        </h4>
      </div>
      <div class="trip-plan-body">
        ${flightCard}
        ${hotelCard}
        ${attractionsCard}

        <div class="trip-plan-item">
          <div class="trip-plan-item-icon"><i class="ri-calendar-todo-line"></i></div>
          <div class="trip-plan-item-content">
            <h5>Your ${escapeHtml(String(details.days || 'N'))}-Day Itinerary</h5>
            ${itinerary_text && itinerary_text.trim() ? `
              <p class="itinerary-day">${formattedItinerary}</p>
            ` : `
              <p class="itinerary-day" style="color: #6b7280; font-style: italic;">
                ${itinerary_object.day_by_day && itinerary_object.day_by_day.length > 0 ? 
                  itinerary_object.day_by_day.map(day => {
                    const dayNum = day.day || '';
                    const title = day.title || '';
                    const details = day.details || '';
                    return `<strong>Day ${dayNum}${title ? ': ' + escapeHtml(title) : ''}</strong>${details ? '<br>' + escapeHtml(details) : ''}`;
                  }).join('<br><br>') :
                  `Planning your ${details.days || ''}-day trip to ${details.destination || 'your destination'}. Please wait while I create a detailed itinerary...`
                }
              </p>
            `}
          </div>
        </div>
      </div>
      <!-- Embed JSON representation of the plan so the Save button can access it -->
      <script type="application/json" class="trip-plan-json">${JSON.stringify(plan).replace(/</g, '\u003c')}</script>
    </div>
  `;
}

// Small helper: basic HTML escape to prevent breaking the injected HTML
  function escapeHtml(unsafe) {
    return (unsafe + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render hotel results as an interactive trip-plan card using the existing renderTripPlan helper.
  // The backend returns an array of hotel objects; we wrap them into a minimal plan so selection and save flows work.
  function renderHotelCards(hotels) {
    if (!Array.isArray(hotels) || hotels.length === 0) return '';

    // Defensive mapping: ensure each hotel is a plain object
    const cleanedHotels = hotels.map(h => {
      try { return (typeof h === 'string') ? JSON.parse(h) : h; } catch (e) { return h || {}; }
    });

    const plan = {
      details: { destination: cleanedHotels[0].destination || cleanedHotels[0].city || '' },
      hotels: cleanedHotels
    };

    // Reuse renderTripPlan to produce a trip-plan-card with hotel options and embedded JSON
    return renderTripPlan(plan);
  }

})();