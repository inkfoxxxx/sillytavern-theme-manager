(function () {
    'use strict';

    // 从 SillyTavern 核心上下文中，安全地获取我们需要的官方工具
    const { getRequestHeaders, getSettings } = SillyTavern.getContext();

    const FAVORITES_KEY = 'themeManager_favorites';

    // 之前修复过的、更宽容的 API 请求函数
    async function apiRequest(endpoint, method = 'POST', body = {}) {
        try {
            const headers = getRequestHeaders();
            const options = { method, headers };
            if (method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`/api/${endpoint}`, options);
            const responseText = await response.text();
            if (!response.ok) {
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    throw new Error(responseText || `HTTP error! status: ${response.status}`);
                }
            }
            if (responseText.trim().toUpperCase() === 'OK') {
                return { status: 'OK' };
            }
            return responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            console.error(`API request to /api/${endpoint} failed:`, error);
            toastr.error(`API请求失败: ${error.message}`);
            throw error;
        }
    }

    async function getAllThemesFromAPI() {
        const settings = await apiRequest('settings/get', 'POST', {});
        return settings.themes || [];
    }

    async function deleteTheme(themeName) {
        await apiRequest('themes/delete', 'POST', { name: themeName });
    }

    async function saveTheme(themeObject) {
        await apiRequest('themes/save', 'POST', themeObject);
    }

    // 【核心修复！】模仿原生逻辑，手动更新原始的<select>菜单
    function manualUpdateOriginalSelect(action, oldName, newName) {
        const originalSelect = document.querySelector('#themes');
        if (!originalSelect) return;

        switch (action) {
            case 'add':
                const option = document.createElement('option');
                option.value = newName;
                option.textContent = newName;
                originalSelect.appendChild(option);
                break;
            case 'delete':
                const optionToDelete = originalSelect.querySelector(`option[value="${oldName}"]`);
                if (optionToDelete) optionToDelete.remove();
                break;
            case 'rename':
                const optionToRename = originalSelect.querySelector(`option[value="${oldName}"]`);
                if (optionToRename) {
                    optionToRename.value = newName;
                    optionToRename.textContent = newName;
                }
                break;
        }
    }

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager (Final Victory): 找到了目标元素，开始初始化...");
            clearInterval(initInterval);

            try {
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                // 我们不再隐藏原始select，因为它现在是我们的数据源。我们只隐藏它的视觉外观。
                originalSelect.style.position = 'absolute';
                originalSelect.style.opacity = '0';
                originalSelect.style.pointerEvents = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <h4><span>🎨 主题仪表盘 (最终胜利版)</span></h4>
                    <div class="theme-manager-actions">
                        <input type="search" id="theme-search-box" placeholder="🔍 搜索主题...">
                        <button id="random-theme-btn" title="随机应用一个主题">🎲 随机</button>
                    </div>
                    <div class="theme-content"></div>
                `;
                originalContainer.prepend(managerPanel);
                
                const searchBox = managerPanel.querySelector('#theme-search-box');
                const randomBtn = managerPanel.querySelector('#random-theme-btn');
                const contentWrapper = managerPanel.querySelector('.theme-content');

                let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
                let allThemeObjects = []; // 缓存主题对象，用于重命名

                function saveFavorites() {
                    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                }

                async function buildThemeUI() {
                    contentWrapper.innerHTML = '正在加载主题...';
                    try {
                        // 在每次构建UI时，都从API获取最新的完整主题对象列表并缓存
                        allThemeObjects = await getAllThemesFromAPI();
                        contentWrapper.innerHTML = '';
    
                        const allThemes = Array.from(originalSelect.options).map(option => {
                            const themeName = option.value;
                            if (!themeName) return null;

                            let displayName = themeName;
                            const categories = [];
                            const tagRegex = /\[(.*?)\]/g;
                            let match;
    
                            while ((match = tagRegex.exec(themeName)) !== null) {
                                const tag = match[1].trim();
                                if (tag) categories.push(tag);
                            }
                            
                            displayName = themeName.replace(tagRegex, '').trim();
                            if (categories.length === 0) categories.push('未分类');
                            
                            return { value: themeName, display: displayName, categories };
                        }).filter(Boolean);
                        
                        const allCategories = new Set(allThemes.flatMap(t => t.categories));
                        const sortedCategories = ['⭐ 收藏夹', ...Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
    
                        sortedCategories.forEach(category => {
                            const themesInCategory = (category === '⭐ 收藏夹')
                                ? allThemes.filter(theme => favorites.includes(theme.value))
                                : allThemes.filter(theme => theme.categories.includes(category));
    
                            if (themesInCategory.length === 0) return;
    
                            const categoryDiv = document.createElement('div');
                            categoryDiv.className = 'theme-category';
                            const title = document.createElement('div');
                            title.className = 'theme-category-title';
                            title.textContent = category;
                            const list = document.createElement('ul');
                            list.className = 'theme-list';
                            list.style.display = 'block';
    
                            title.addEventListener('click', () => list.style.display = (list.style.display === 'none') ? 'block' : 'none');
    
                            themesInCategory.forEach(theme => {
                                const item = document.createElement('li');
                                item.className = 'theme-item';
                                item.dataset.value = theme.value;
                                item.innerHTML = `
                                    <span class="theme-item-name">${theme.display}</span>
                                    <div class="theme-item-buttons">
                                        <button class="favorite-btn" title="收藏">⭐</button>
                                        <button class="rename-btn" title="重命名">✏️</button>
                                        <button class="delete-btn" title="删除">🗑️</button>
                                    </div>
                                `;
                                
                                const favBtn = item.querySelector('.favorite-btn');
                                const renameBtn = item.querySelector('.rename-btn');
                                const deleteBtn = item.querySelector('.delete-btn');
    
                                if (favorites.includes(theme.value)) favBtn.classList.add('is-favorite');
    
                                item.querySelector('.theme-item-name').addEventListener('click', () => {
                                    originalSelect.value = theme.value;
                                    originalSelect.dispatchEvent(new Event('change'));
                                });
                                
                                favBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    if (favorites.includes(theme.value)) {
                                        favorites = favorites.filter(f => f !== theme.value);
                                    } else {
                                        favorites.push(theme.value);
                                    }
                                    saveFavorites();
                                    buildThemeUI();
                                });
    
                                renameBtn.addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    const oldName = theme.value;
                                    const newName = prompt(`请输入 "${theme.display}" 的新名称：`, oldName);
                                    if (newName && newName !== oldName) {
                                        try {
                                            const themeObject = allThemeObjects.find(t => t.name === oldName);
                                            if (!themeObject) {
                                                toastr.error('找不到原始主题对象！请先等待主题列表加载完成。');
                                                return;
                                            }
                                            const newThemeObject = { ...themeObject, name: newName };
                                            await saveTheme(newThemeObject);
                                            await deleteTheme(oldName);
                                            toastr.success(`主题已重命名为 "${newName}"！`);
                                            
                                            // 【核心修复！】手动同步UI
                                            manualUpdateOriginalSelect('rename', oldName, newName);
                                            await buildThemeUI();
                                        } catch (err) {}
                                    }
                                });
    
                                deleteBtn.addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    const themeName = theme.value;
                                    if (confirm(`确定要删除主题 "${theme.display}" 吗？此操作无法撤销。`)) {
                                        try {
                                            await deleteTheme(themeName);
                                            toastr.success(`主题 "${theme.display}" 已删除！`);
                                            
                                            // 【核心修复！】手动同步UI
                                            manualUpdateOriginalSelect('delete', themeName, null);
                                            await buildThemeUI();
                                        } catch (err) {}
                                    }
                                });
                                
                                list.appendChild(item);
                            });
                            
                            categoryDiv.appendChild(title);
                            categoryDiv.appendChild(list);
                            contentWrapper.appendChild(categoryDiv);
                        });
                        updateActiveState();
                    } catch (err) {
                        contentWrapper.innerHTML = '加载主题失败，请检查浏览器控制台获取更多信息。';
                    }
                }

                function updateActiveState() {
                    const currentValue = originalSelect.value;
                    managerPanel.querySelectorAll('.theme-item').forEach(item => {
                        item.classList.toggle('active', item.dataset.value === currentValue);
                    });
                }
                
                searchBox.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    managerPanel.querySelectorAll('.theme-item').forEach(item => {
                        item.style.display = item.querySelector('.theme-item-name').textContent.toLowerCase().includes(searchTerm) ? 'flex' : 'none';
                    });
                });

                randomBtn.addEventListener('click', async () => {
                    const themes = await getAllThemesFromAPI();
                    if (themes.length > 0) {
                        const randomIndex = Math.floor(Math.random() * themes.length);
                        originalSelect.value = themes[randomIndex].name;
                        originalSelect.dispatchEvent(new Event('change'));
                    }
                });
                
                // 监听原始select的变化，以同步我们的高亮状态
                originalSelect.addEventListener('change', updateActiveState);

                // 监听DOM变化，以应对原生“另存为”等操作
                const observer = new MutationObserver(buildThemeUI);
                observer.observe(originalSelect, { childList: true });

                buildThemeUI();
                
            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
                if(originalSelect) originalSelect.parentElement.style.display = '';
            }
        }
    }, 250);

})();
