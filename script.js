(function () {
    'use strict';

    const FAVORITES_KEY = 'themeManager_favorites';

    // API 调用函数
    async function apiRequest(endpoint, method = 'POST', body = {}) {
        try {
            const headers = getRequestHeaders();
            if (method.toUpperCase() === 'GET') {
                delete headers['Content-Type'];
            }

            const response = await axios({
                method: method,
                url: `/api/${endpoint}`,
                data: body,
                headers: headers,
            });
            return response.data;
        } catch (error) {
            console.error(`API request to /api/${endpoint} failed:`, error);
            toastr.error(`API请求失败: ${error.response?.data?.error || error.message}`);
            throw error;
        }
    }

    async function getAllThemes() {
        const settings = await apiRequest('settings/get', 'POST', {});
        return settings.themes || [];
    }

    async function deleteTheme(themeName) {
        await apiRequest('themes/delete', 'POST', { name: themeName });
    }

    async function saveTheme(themeObject) {
        await apiRequest('themes/save', 'POST', themeObject);
    }

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager v4.0 (API): 找到了目标元素，开始初始化...");
            clearInterval(initInterval);

            try {
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.display = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <h4><span>🎨 主题仪表盘 (API版)</span></h4>
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

                function saveFavorites() {
                    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                }

                async function buildThemeUI() {
                    contentWrapper.innerHTML = '正在加载主题...';
                    const allThemeObjects = await getAllThemes();
                    contentWrapper.innerHTML = '';

                    const allThemes = [];
                    const allCategories = new Set();

                    allThemeObjects.forEach(themeObj => {
                        const themeName = themeObj.name;
                        let displayName = themeName;
                        const categories = [];
                        const tagRegex = /\[(.*?)\]/g;
                        let match;

                        while ((match = tagRegex.exec(themeName)) !== null) {
                            const tag = match[1].trim();
                            if (tag) {
                                categories.push(tag);
                                allCategories.add(tag);
                            }
                        }
                        
                        displayName = themeName.replace(tagRegex, '').trim();
                        if (categories.length === 0) categories.push('未分类');
                        
                        allThemes.push({ value: themeName, display: displayName, categories: categories });
                    });
                    
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
                        list.style.display = 'block'; // 默认全部展开

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

                            // 应用主题
                            item.querySelector('.theme-item-name').addEventListener('click', () => {
                                originalSelect.value = theme.value;
                                originalSelect.dispatchEvent(new Event('change'));
                            });
                            
                            // 收藏
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

                            // 重命名
                            renameBtn.addEventListener('click', async (e) => {
                                e.stopPropagation();
                                const newName = prompt(`请输入 "${theme.display}" 的新名称：`, theme.value);
                                if (newName && newName !== theme.value) {
                                    try {
                                        const themeObject = allThemeObjects.find(t => t.name === theme.value);
                                        const newThemeObject = { ...themeObject, name: newName };
                                        await saveTheme(newThemeObject);
                                        await deleteTheme(theme.value);
                                        toastr.success(`主题已重命名为 "${newName}"！`);
                                        buildThemeUI();
                                    } catch (err) {}
                                }
                            });

                            // 删除
                            deleteBtn.addEventListener('click', async (e) => {
                                e.stopPropagation();
                                if (confirm(`确定要删除主题 "${theme.display}" 吗？此操作无法撤销。`)) {
                                    try {
                                        await deleteTheme(theme.value);
                                        toastr.success(`主题 "${theme.display}" 已删除！`);
                                        buildThemeUI();
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
                    const themes = await getAllThemes();
                    if (themes.length > 0) {
                        const randomIndex = Math.floor(Math.random() * themes.length);
                        originalSelect.value = themes[randomIndex].name;
                        originalSelect.dispatchEvent(new Event('change'));
                    }
                });
                
                originalSelect.addEventListener('change', updateActiveState);
                buildThemeUI();
                
            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
                if(originalSelect) originalSelect.parentElement.style.display = '';
            }
        }
    }, 250);

})();
