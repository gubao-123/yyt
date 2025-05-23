// 全局变量
let currentQuestionIndex = -1;
let currentCategory = '';
let questions = [];
let canvas, ctx;
let currentQuestions = [];
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加载');
    
    // 初始化登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (validateLogin(username, password)) {
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('appContainer').style.display = 'flex';
                loadQuestions();
            } else {
                document.getElementById('loginError').textContent = '用户名或密码错误！';
            }
        });
    }
    
    // 初始化控制按钮
    document.getElementById('startLearning')?.addEventListener('click', startLearning);
    document.getElementById('resetProgress')?.addEventListener('click', resetProgress);
    document.getElementById('clearHandwriting')?.addEventListener('click', clearHandwriting);
    document.getElementById('showAnswer')?.addEventListener('click', showAnswer);
    document.getElementById('nextQuestion')?.addEventListener('click', nextQuestion);
    
    // 初始化手写板（使用改进后的初始化方式）
    initHandwritingCanvas();
});

// 验证登录
function validateLogin(username, password) {
    const accounts = [
        { username: 'teacher1', password: '123456' },
        { username: 'teacher2', password: '123456' },
        { username: 'student1', password: '123456' }
    ];
    return accounts.some(acc => acc.username === username && acc.password === password);
}

// 加载题目数据
function loadQuestions() {
    fetch('questions.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
            return response.text();
        })
        .then(text => {
            // 处理BOM字符
            if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
            
            try {
                questions = JSON.parse(text);
                initializeApp();
            } catch (e) {
                console.error('JSON解析错误:', e);
                alert('题目数据格式错误，请检查questions.json文件');
            }
        })
        .catch(error => {
            console.error('加载题目失败:', error);
            alert('加载题目失败: ' + error.message);
        });
}

// 初始化应用
function initializeApp() {
    populateCategorySelect();
}

// 填充题型选择下拉框
function populateCategorySelect() {
    const select = document.getElementById('categorySelect');
    if (!select) return;
    
    const categories = [...new Set(questions.map(q => q.dalei).filter(Boolean))];
    select.innerHTML = '<option value="">选择题型</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    select.addEventListener('change', function() {
        currentCategory = this.value;
        currentQuestions = questions.filter(q => q.dalei === currentCategory);
        updateStats();
    });
}

// 开始学习
function startLearning() {
    if (!currentCategory) {
        alert('请先选择题型！');
        return;
    }
    
    const unansweredQuestions = currentQuestions.filter(q => q.state !== '已学');
    
    if (unansweredQuestions.length === 0) {
        alert('该题型所有题目已完成！');
        return;
    }
    
    currentQuestionIndex = Math.floor(Math.random() * unansweredQuestions.length);
    displayQuestion(unansweredQuestions[currentQuestionIndex]);
}

// 显示题目
function displayQuestion(question) {
    const questionTitle = document.getElementById('questionTitle');
    if (questionTitle) questionTitle.textContent = question.title || '无题目内容';
    
    // 清空答案输入框
    ['answer1', 'answer2', 'answer3', 'answer4'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    
    // 隐藏参考答案
    const refAnswers = document.getElementById('referenceAnswers');
    if (refAnswers) {
        refAnswers.style.display = 'none';
        refAnswers.innerHTML = '';
    }
    
    // 显示图形（如果有）
    const drawingArea = document.getElementById('drawingCanvas');
    if (drawingArea) {
        drawingArea.innerHTML = '';
        
        if (question.id) {
            const img = document.createElement('img');
            img.src = question.picture || `picture1/${question.id}.png`;
            img.onerror = function() {
                console.log('图片加载失败:', this.src);
                this.style.display = 'none';
            };
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.alt = '题目图示';
            drawingArea.appendChild(img);
        }
    }
    
    // 清空手写板
    clearHandwriting();
    
    // 确保手写板重新初始化
    initHandwritingCanvas(true);
}

// 更新学习统计
function updateStats() {
    if (!currentCategory) return;
    
    const learnedCount = document.getElementById('learnedCount');
    const totalCount = document.getElementById('totalCount');
    
    if (learnedCount && totalCount) {
        const total = currentQuestions.length;
        const learned = currentQuestions.filter(q => q.state === '已学').length;
        
        learnedCount.textContent = learned;
        totalCount.textContent = total;
    }
}

// 下一题
function nextQuestion() {
    if (currentQuestionIndex === -1 || currentQuestions.length === 0) return;
    
    currentQuestions[currentQuestionIndex].state = '已学';
    updateStats();
    startLearning();
}

// 显示答案
function showAnswer() {
    if (currentQuestionIndex === -1 || currentQuestions.length === 0) {
        alert('请先开始学习题目！');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    const refAnswers = document.getElementById('referenceAnswers');
    
    if (!refAnswers) return;
    
    let answersHTML = '<div class="answers-title"><strong>参考答案</strong></div>';
    
    if (question.answer1 && question.answer1.trim() !== '') 
        answersHTML += `<div class="answer-item">${escapeHtml(question.answer1)}</div>`;
    if (question.answer2 && question.answer2.trim() !== '') 
        answersHTML += `<div class="answer-item">${escapeHtml(question.answer2)}</div>`;
    if (question.answer3 && question.answer3.trim() !== '') 
        answersHTML += `<div class="answer-item">${escapeHtml(question.answer3)}</div>`;
    if (question.answer4 && question.answer4.trim() !== '') 
        answersHTML += `<div class="answer-item">${escapeHtml(question.answer4)}</div>`;
    
    refAnswers.innerHTML = answersHTML;
    refAnswers.style.display = 'block';
}

// HTML转义函数
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 重置进度
function resetProgress() {
    if (!currentCategory) {
        alert('请先选择题型！');
        return;
    }
    
    if (confirm('确定要重置该题型的学习进度吗？所有已学题目将标记为未学。')) {
        currentQuestions.forEach(q => {
            q.state = '未学';
        });
        updateStats();
        alert('进度已重置！');
    }
}

// 修改后的手写板初始化函数
function initHandwritingCanvas() {
    canvas = document.getElementById('handwritingCanvas');
    if (!canvas) {
        console.error('未找到手写板画布');
        return;
    }
    
    // 确保画布可见后再初始化
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            setupCanvas();
            observer.disconnect();
        }
    });
    observer.observe(canvas);
    
    function setupCanvas() {
        ctx = canvas.getContext('2d');
        
        // 设置画布大小
        function resizeCanvas() {
            const container = document.querySelector('.handwriting-area');
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            // 设置画布样式
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // 强制重绘
            canvas.style.display = 'none';
            canvas.offsetHeight; // 触发重排
            canvas.style.display = 'block';
        }
        
        // 初始调整大小
        resizeCanvas();
        
        // 窗口大小改变时调整画布
        window.addEventListener('resize', resizeCanvas);
        
        // 鼠标事件处理
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDrawing);
        canvas.addEventListener('mouseout', endDrawing);
        
        // 触摸事件处理
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', endDrawing);
        
        console.log('手写板初始化完成');
    }
}

// 开始绘制
function startDrawing(e) {
    if (!canvas || !ctx) return;
    
    isDrawing = true;
    const pos = getCanvasPosition(e);
    lastX = pos.x;
    lastY = pos.y;
    
    // 开始新的路径
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
}

// 绘制中
function draw(e) {
    if (!isDrawing || !canvas || !ctx) return;
    
    const pos = getCanvasPosition(e);
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
}

// 结束绘制
function endDrawing() {
    isDrawing = false;
}

// 获取画布坐标
function getCanvasPosition(e) {
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches) {
        // 触摸事件
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        // 鼠标事件
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

// 触摸开始
function handleTouchStart(e) {
    e.preventDefault();
    if (!canvas) return;
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// 触摸移动
function handleTouchMove(e) {
    e.preventDefault();
    if (!canvas) return;
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// 清空手写板
function clearHandwriting() {
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}