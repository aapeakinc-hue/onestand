// ==================== 主应用逻辑 ====================

// 导入配置和API
import { CATEGORIES, FEEDBACK_TAGS } from './config.js';
import { sendMessage, sendFeedback } from './api.js';

// 全局变量
let currentMainCategory = 'workplace';
let currentSubCategory = 'workplace-conflict';
let history = [];
let conversations = [];
let favorites = [];
let feedbacks = [];
let currentTab = 'history';
let recognition = null;

// DOM元素
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');

// ==================== 初始化 ====================
function initApp() {
    console.log('一弭应用启动中...');
    
    // 加载分类
    loadMainCategories();
    renderSubCategories('workplace');
    updateCategoryDisplay();
    
    // 初始化事件监听
    initEventListeners();
    
    // 初始化语音识别
    initVoiceRecognition();
    
    // 加载本地存储
    loadFromStorage();
    
    console.log('一弭应用启动完成');
}

// ==================== 事件监听 ====================
function initEventListeners() {
    // 发送按钮
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    
    // 历史按钮
    document.getElementById('historyBtn').addEventListener('click', openHistorySidebar);
    
    // 推荐问题点击
    document.getElementById('suggestedQuestions').addEventListener('click', (e) => {
        if (e.target.classList.contains('suggested-question')) {
            userInput.value = e.target.textContent;
            userInput.focus();
        }
    });
}

// ==================== 分类相关 ====================
function loadMainCategories() {
    const container = document.getElementById('mainCategories');
    container.innerHTML = Object.keys(CATEGORIES).map(key => 
        `<button class="main-category ${key === 'workplace' ? 'active' : ''}" data-category="${key}">${CATEGORIES[key].name}</button>`
    ).join('');
    
    container.querySelectorAll('.main-category').forEach(btn => {
        btn.addEventListener('click', function() {
            container.querySelectorAll('.main-category').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentMainCategory = this.dataset.category;
            renderSubCategories(currentMainCategory);
            updateCategoryDisplay();
        });
    });
}

function renderSubCategories(mainCategory) {
    const container = document.getElementById('subCategories');
    const category = CATEGORIES[mainCategory];
    
    container.innerHTML = category.subs.map((sub, i) => 
        `<button class="sub-category ${i === 0 ? 'active' : ''}" data-id="${sub.id}">${sub.name}</button>`
    ).join('');
    
    currentSubCategory = category.subs[0].id;
    renderQuestions(category.subs[0]);
    updateCategoryDisplay();
    
    container.querySelectorAll('.sub-category').forEach(btn => {
        btn.addEventListener('click', function() {
            container.querySelectorAll('.sub-category').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSubCategory = this.dataset.id;
            const sub = category.subs.find(s => s.id === currentSubCategory);
            renderQuestions(sub);
            updateCategoryDisplay();
        });
    });
}

function renderQuestions(sub) {
    const container = document.getElementById('suggestedQuestions');
    if (!sub || !sub.questions) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `<span class="suggested-questions-label">试试：</span>` + 
        sub.questions.map(q => `<button class="suggested-question">${q}</button>`).join('');
}

function updateCategoryDisplay() {
    const main = CATEGORIES[currentMainCategory];
    const sub = main.subs.find(s => s.id === currentSubCategory);
    document.getElementById('categoryText').textContent = `${main.name} · ${sub ? sub.name : ''}`;
}

// ==================== 消息相关 ====================
function addMessage(role, content) {
    const messageId = Date.now();
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.dataset.id = messageId;
    
    if (role === 'assistant') {
        div.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-actions">
                <button class="action-btn" onclick="copyMessage('${messageId}', this)">复制</button>
                <button class="action-btn" onclick="favoriteMessage('${messageId}', this)">收藏</button>
                <button class="action-btn" onclick="toggleFeedback('${messageId}', 'like', this)">👍</button>
                <button class="action-btn" onclick="toggleFeedback('${messageId}', 'dislike', this)">👎</button>
            </div>
            <div class="feedback-section" id="feedback-${messageId}">
                <div class="feedback-title">请告诉我们哪里需要改进：</div>
                <div class="feedback-tags">
                    ${FEEDBACK_TAGS.map(tag => 
                        `<button class="feedback-tag" data-tag="${tag.id}" onclick="selectFeedbackTag('${messageId}', '${tag.id}', this)">${tag.label}</button>`
                    ).join('')}
                </div>
                <div class="feedback-input">
                    <input type="text" placeholder="其他建议..." id="feedback-input-${messageId}" />
                    <button class="feedback-submit" onclick="submitFeedback('${messageId}')">提交</button>
                </div>
                <div class="feedback-thanks" id="feedback-thanks-${messageId}">感谢您的反馈，我们会持续改进！</div>
            </div>
        `;
    } else {
        div.innerHTML = `<div class="message-content">${content}</div>`;
    }
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageId;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typing';
    div.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTyping() {
    const t = document.getElementById('typing');
    if (t) t.remove();
}

async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    userInput.value = '';
    sendBtn.disabled = true;
    showTyping();

    try {
        const result = await sendMessage(message, currentSubCategory, history.slice(-4));
        removeTyping();
        
        if (result.success) {
            const answerId = addMessage('assistant', result.reply);
            
            const conversation = {
                id: answerId,
                question: message,
                content: result.reply,
                category: currentSubCategory,
                time: new Date().toLocaleString('zh-CN')
            };
            conversations.unshift(conversation);
            if (conversations.length > 50) conversations.pop();
            saveToStorage();
            
            history.push({ role: 'user', content: message }, { role: 'assistant', content: result.reply });
        } else {
            addMessage('assistant', `抱歉：${result.error}`);
        }
    } catch (e) {
        removeTyping();
        addMessage('assistant', '网络异常，请稍后再试。');
    }
    sendBtn.disabled = false;
}

// ==================== 消息操作 ====================
window.copyMessage = function(messageId, btn) {
    const msg = document.querySelector(`.message[data-id="${messageId}"] .message-content`);
    if (msg) {
        navigator.clipboard.writeText(msg.textContent).then(() => {
            btn.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '复制';
                btn.classList.remove('copied');
            }, 2000);
        });
    }
};

window.favoriteMessage = function(messageId, btn) {
    const msg = document.querySelector(`.message[data-id="${messageId}"] .message-content`);
    if (msg) {
        const favorite = {
            id: messageId,
            content: msg.textContent,
            time: new Date().toLocaleString('zh-CN')
        };
        favorites.unshift(favorite);
        saveToStorage();
        
        btn.textContent = '已收藏';
        btn.classList.add('favorited');
        showToast('已收藏到我的收藏');
    }
};

window.toggleFeedback = function(messageId, type, btn) {
    const feedbackSection = document.getElementById(`feedback-${messageId}`);
    const allBtns = btn.parentElement.querySelectorAll('.action-btn');
    
    allBtns.forEach(b => {
        if (b.textContent.includes('👍') || b.textContent.includes('👎')) {
            b.classList.remove('liked', 'disliked');
        }
    });
    
    if (type === 'like') {
        btn.classList.add('liked');
        showToast('感谢您的认可！');
    } else {
        btn.classList.add('disliked');
        feedbackSection.classList.add('show');
    }
};

window.selectFeedbackTag = function(messageId, tagId, btn) {
    btn.classList.toggle('selected');
};

window.submitFeedback = function(messageId) {
    const feedbackSection = document.getElementById(`feedback-${messageId}`);
    const selectedTags = feedbackSection.querySelectorAll('.feedback-tag.selected');
    const input = document.getElementById(`feedback-input-${messageId}`);
    
    const tags = Array.from(selectedTags).map(t => t.dataset.tag);
    const comment = input.value.trim();
    
    if (tags.length === 0 && !comment) {
        showToast('请选择问题标签或输入建议');
        return;
    }
    
    const feedback = {
        id: Date.now(),
        messageId: messageId,
        rating: 'negative',
        tags: tags,
        comment: comment,
        time: new Date().toLocaleString('zh-CN')
    };
    
    feedbacks.unshift(feedback);
    saveToStorage();
    sendFeedback(feedback);
    
    feedbackSection.querySelector('.feedback-input').style.display = 'none';
    feedbackSection.querySelector('.feedback-tags').style.display = 'none';
    feedbackSection.querySelector('.feedback-title').style.display = 'none';
    document.getElementById(`feedback-thanks-${messageId}`).classList.add('show');
    
    showToast('感谢您的反馈！');
};

// ==================== 历史记录 ====================
function openHistorySidebar() {
    showToast('历史记录功能开发中...');
}

// ==================== 语音识别 ====================
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('浏览器不支持语音识别');
        document.getElementById('voiceBtn').style.display = 'none';
        return;
    }

    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            userInput.focus();
            showToast('识别成功');
        };

        recognition.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            let errorMsg = '语音识别失败';
            
            switch(event.error) {
                case 'no-speech':
                    errorMsg = '未检测到语音，请重试';
                    break;
                case 'audio-capture':
                    errorMsg = '无法访问麦克风';
                    break;
                case 'not-allowed':
                    errorMsg = '麦克风权限被拒绝';
                    break;
                case 'network':
                    errorMsg = '网络错误，请检查连接';
                    break;
            }
            
            showToast(errorMsg);
            document.getElementById('voiceBtn').classList.remove('recording');
        };

        recognition.onend = function() {
            document.getElementById('voiceBtn').classList.remove('recording');
        };

        recognition.onstart = function() {
            showToast('正在聆听...');
        };

        document.getElementById('voiceBtn').addEventListener('click', function() {
            if (this.classList.contains('recording')) {
                recognition.stop();
                this.classList.remove('recording');
            } else {
                try {
                    recognition.start();
                    this.classList.add('recording');
                } catch (error) {
                    console.error('启动语音识别失败:', error);
                    showToast('语音识别启动失败，请重试');
                }
            }
        });

    } catch (error) {
        console.error('初始化语音识别失败:', error);
        document.getElementById('voiceBtn').style.display = 'none';
    }
}

// ==================== 本地存储 ====================
function loadFromStorage() {
    try {
        const savedConversations = localStorage.getItem('yimi_conversations');
        const savedFavorites = localStorage.getItem('yimi_favorites');
        if (savedConversations) conversations = JSON.parse(savedConversations);
        if (savedFavorites) favorites = JSON.parse(savedFavorites);
    } catch (e) {
        console.error('加载存储失败', e);
    }
}

function saveToStorage() {
    try {// ==================== 主应用逻辑 ====================

// 导入配置和API
import { CATEGORIES, FEEDBACK_TAGS } from './config.js';
import { sendMessage, sendFeedback } from './api.js';

// 全局变量
let currentMainCategory = 'workplace';
let currentSubCategory = 'workplace-conflict';
let history = [];
let conversations = [];
let favorites = [];
let feedbacks = [];
let currentTab = 'history';
let recognition = null;

// DOM元素
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');

// ==================== 初始化 ====================
function initApp() {
    console.log('一弭应用启动中...');
    
    // 加载分类
    loadMainCategories();
    renderSubCategories('workplace');
    updateCategoryDisplay();
    
    // 初始化事件监听
    initEventListeners();
    
    // 初始化语音识别
    initVoiceRecognition();
    
    // 加载本地存储
    loadFromStorage();
    
    console.log('一弭应用启动完成');
}

// ==================== 事件监听 ====================
function initEventListeners() {
    // 发送按钮
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    
    // 历史按钮
    document.getElementById('historyBtn').addEventListener('click', openHistorySidebar);
    
    // 推荐问题点击
    document.getElementById('suggestedQuestions').addEventListener('click', (e) => {
        if (e.target.classList.contains('suggested-question')) {
            userInput.value = e.target.textContent;
            userInput.focus();
        }
    });
}

// ==================== 分类相关 ====================
function loadMainCategories() {
    const container = document.getElementById('mainCategories');
    container.innerHTML = Object.keys(CATEGORIES).map(key => 
        `<button class="main-category ${key === 'workplace' ? 'active' : ''}" data-category="${key}">${CATEGORIES[key].name}</button>`
    ).join('');
    
    container.querySelectorAll('.main-category').forEach(btn => {
        btn.addEventListener('click', function() {
            container.querySelectorAll('.main-category').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentMainCategory = this.dataset.category;
            renderSubCategories(currentMainCategory);
            updateCategoryDisplay();
        });
    });
}

function renderSubCategories(mainCategory) {
    const container = document.getElementById('subCategories');
    const category = CATEGORIES[mainCategory];
    
    container.innerHTML = category.subs.map((sub, i) => 
        `<button class="sub-category ${i === 0 ? 'active' : ''}" data-id="${sub.id}">${sub.name}</button>`
    ).join('');
    
    currentSubCategory = category.subs[0].id;
    renderQuestions(category.subs[0]);
    updateCategoryDisplay();
    
    container.querySelectorAll('.sub-category').forEach(btn => {
        btn.addEventListener('click', function() {
            container.querySelectorAll('.sub-category').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSubCategory = this.dataset.id;
            const sub = category.subs.find(s => s.id === currentSubCategory);
            renderQuestions(sub);
            updateCategoryDisplay();
        });
    });
}

function renderQuestions(sub) {
    const container = document.getElementById('suggestedQuestions');
    if (!sub || !sub.questions) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `<span class="suggested-questions-label">试试：</span>` + 
        sub.questions.map(q => `<button class="suggested-question">${q}</button>`).join('');
}

function updateCategoryDisplay() {
    const main = CATEGORIES[currentMainCategory];
    const sub = main.subs.find(s => s.id === currentSubCategory);
    document.getElementById('categoryText').textContent = `${main.name} · ${sub ? sub.name : ''}`;
}

// ==================== 消息相关 ====================
function addMessage(role, content) {
    const messageId = Date.now();
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.dataset.id = messageId;
    
    if (role === 'assistant') {
        div.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-actions">
                <button class="action-btn" onclick="copyMessage('${messageId}', this)">复制</button>
                <button class="action-btn" onclick="favoriteMessage('${messageId}', this)">收藏</button>
                <button class="action-btn" onclick="toggleFeedback('${messageId}', 'like', this)">👍</button>
                <button class="action-btn" onclick="toggleFeedback('${messageId}', 'dislike', this)">👎</button>
            </div>
            <div class="feedback-section" id="feedback-${messageId}">
                <div class="feedback-title">请告诉我们哪里需要改进：</div>
                <div class="feedback-tags">
                    ${FEEDBACK_TAGS.map(tag => 
                        `<button class="feedback-tag" data-tag="${tag.id}" onclick="selectFeedbackTag('${messageId}', '${tag.id}', this)">${tag.label}</button>`
                    ).join('')}
                </div>
                <div class="feedback-input">
                    <input type="text" placeholder="其他建议..." id="feedback-input-${messageId}" />
                    <button class="feedback-submit" onclick="submitFeedback('${messageId}')">提交</button>
                </div>
                <div class="feedback-thanks" id="feedback-thanks-${messageId}">感谢您的反馈，我们会持续改进！</div>
            </div>
        `;
    } else {
        div.innerHTML = `<div class="message-content">${content}</div>`;
    }
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageId;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typing';
    div.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTyping() {
    const t = document.getElementById('typing');
    if (t) t.remove();
}

async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    userInput.value = '';
    sendBtn.disabled = true;
    showTyping();

    try {
        const result = await sendMessage(message, currentSubCategory, history.slice(-4));
        removeTyping();
        
        if (result.success) {
            const answerId = addMessage('assistant', result.reply);
            
            const conversation = {
                id: answerId,
                question: message,
                content: result.reply,
                category: currentSubCategory,
                time: new Date().toLocaleString('zh-CN')
            };
            conversations.unshift(conversation);
            if (conversations.length > 50) conversations.pop();
            saveToStorage();
            
            history.push({ role: 'user', content: message }, { role: 'assistant', content: result.reply });
        } else {
            console.error('API错误详情:', result);
            addMessage('assistant', `抱歉：${result.error}\n\n详细信息：${JSON.stringify(result, null, 2)}`);
        }
    } catch (e) {
        removeTyping();
        console.error('网络错误详情:', e);
        addMessage('assistant', `网络异常：${e.message}`);
    }
    sendBtn.disabled = false;
}

// ==================== 消息操作 ====================
window.copyMessage = function(messageId, btn) {
    const msg = document.querySelector(`.message[data-id="${messageId}"] .message-content`);
    if (msg) {
        navigator.clipboard.writeText(msg.textContent).then(() => {
            btn.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '复制';
                btn.classList.remove('copied');
            }, 2000);
        });
    }
};

window.favoriteMessage = function(messageId, btn) {
    const msg = document.querySelector(`.message[data-id="${messageId}"] .message-content`);
    if (msg) {
        const favorite = {
            id: messageId,
            content: msg.textContent,
            time: new Date().toLocaleString('zh-CN')
        };
        favorites.unshift(favorite);
        saveToStorage();
        
        btn.textContent = '已收藏';
        btn.classList.add('favorited');
        showToast('已收藏到我的收藏');
    }
};

window.toggleFeedback = function(messageId, type, btn) {
    const feedbackSection = document.getElementById(`feedback-${messageId}`);
    const allBtns = btn.parentElement.querySelectorAll('.action-btn');
    
    allBtns.forEach(b => {
        if (b.textContent.includes('👍') || b.textContent.includes('👎')) {
            b.classList.remove('liked', 'disliked');
        }
    });
    
    if (type === 'like') {
        btn.classList.add('liked');
        showToast('感谢您的认可！');
    } else {
        btn.classList.add('disliked');
        feedbackSection.classList.add('show');
    }
};

window.selectFeedbackTag = function(messageId, tagId, btn) {
    btn.classList.toggle('selected');
};

window.submitFeedback = function(messageId) {
    const feedbackSection = document.getElementById(`feedback-${messageId}`);
    const selectedTags = feedbackSection.querySelectorAll('.feedback-tag.selected');
    const input = document.getElementById(`feedback-input-${messageId}`);
    
    const tags = Array.from(selectedTags).map(t => t.dataset.tag);
    const comment = input.value.trim();
    
    if (tags.length === 0 && !comment) {
        showToast('请选择问题标签或输入建议');
        return;
    }
    
    const feedback = {
        id: Date.now(),
        messageId: messageId,
        rating: 'negative',
        tags: tags,
        comment: comment,
        time: new Date().toLocaleString('zh-CN')
    };
    
    feedbacks.unshift(feedback);
    saveToStorage();
    sendFeedback(feedback);
    
    feedbackSection.querySelector('.feedback-input').style.display = 'none';
    feedbackSection.querySelector('.feedback-tags').style.display = 'none';
    feedbackSection.querySelector('.feedback-title').style.display = 'none';
    document.getElementById(`feedback-thanks-${messageId}`).classList.add('show');
    
    showToast('感谢您的反馈！');
};

// ==================== 历史记录 ====================
function openHistorySidebar() {
    showToast('历史记录功能开发中...');
}

// ==================== 语音识别 ====================
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('浏览器不支持语音识别');
        document.getElementById('voiceBtn').style.display = 'none';
        return;
    }

    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            userInput.focus();
            showToast('识别成功');
        };

        recognition.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            let errorMsg = '语音识别失败';
            
            switch(event.error) {
                case 'no-speech':
                    errorMsg = '未检测到语音，请重试';
                    break;
                case 'audio-capture':
                    errorMsg = '无法访问麦克风';
                    break;
                case 'not-allowed':
                    errorMsg = '麦克风权限被拒绝';
                    break;
                case 'network':
                    errorMsg = '网络错误，请检查连接';
                    break;
            }
            
            showToast(errorMsg);
            document.getElementById('voiceBtn').classList.remove('recording');
        };

        recognition.onend = function() {
            document.getElementById('voiceBtn').classList.remove('recording');
        };

        recognition.onstart = function() {
            showToast('正在聆听...');
        };

        document.getElementById('voiceBtn').addEventListener('click', function() {
            if (this.classList.contains('recording')) {
                recognition.stop();
                this.classList.remove('recording');
            } else {
                try {
                    recognition.start();
                    this.classList.add('recording');
                } catch (error) {
                    console.error('启动语音识别失败:', error);
                    showToast('语音识别启动失败，请重试');
                }
            }
        });

    } catch (error) {
        console.error('初始化语音识别失败:', error);
        document.getElementById('voiceBtn').style.display = 'none';
    }
}

// ==================== 本地存储 ====================
function loadFromStorage() {
    try {
        const savedConversations = localStorage.getItem('yimi_conversations');
        const savedFavorites = localStorage.getItem('yimi_favorites');
        if (savedConversations) conversations = JSON.parse(savedConversations);
        if (savedFavorites) favorites = JSON.parse(savedFavorites);
    } catch (e) {
        console.error('加载存储失败', e);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem('yimi_conversations', JSON.stringify(conversations));
        localStorage.setItem('yimi_favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error('保存存储失败', e);
    }
}

// ==================== 工具函数 ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', initApp);
