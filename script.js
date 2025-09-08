(function () {
    'use strict';

    const FAVORITES_KEY = 'themeManager_favorites';

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager v3.0: 找到了目标元素，开始初始化仪表盘...");
            clearInterval(initInterval);

            try {
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.display = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <h4>
                        <span>🎨 主题仪表盘</span>
                    </h4>
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

                function buildThemeUI() {
                    contentWrapper.innerHTML = ''; // 清空旧内容

                    const allThemes = [];
                    const allCategories = new Set();
                    const themeOptions = Array.from(originalSelect.options).filter(opt => opt.value);

                    themeOptions.forEach(option => {
                        const themeName = option.value;
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

                        if (categories.length === 0) {
                            categories.push('未分类');
                            allCategories.add('未分类');
                        }
                        
                        allThemes.push({ value: themeName, display: displayName, categories: categories });
                    });
                    
                    // 总是把“收藏夹”放在最前面
                    const sortedCategories = ['⭐ 收藏夹', ...Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'))];

                    sortedCategories.forEach(category => {
                        let themesInCategory;
                        
                        if (category === '⭐ 收藏夹') {
                            // 从所有主题中筛选出被收藏的
                            themesInCategory = allThemes.filter(theme => favorites.includes(theme.value));
                        } else {
                            themesInCategory = allThemes.filter(theme => theme.categories.includes(category));
                        }

                        // 只有当分类下有主题时才显示
                        if (themesInCategory.length === 0) return;

                        const categoryDiv = document.createElement('div');
                        categoryDiv.className = 'theme-category';
                        const title = document.createElement('div');
                        title.className = 'theme-category-title';
                        title.textContent = category;
                        const list = document.createElement('ul');
                        list.className = 'theme-list';
                        // 默认展开收藏夹和只有一个分类的情况
                        list.style.display = (category === '⭐ 收藏夹' || sortedCategories.length <= 2) ? 'block' : 'none';

                        title.addEventListener('click', () => {
                            list.style.display = (list.style.display === 'none') ? 'block' : 'none';
                        });

                        themesInCategory.forEach(theme => {
                            const item = document.createElement('li');
                            item.className = 'theme-item';
                            item.dataset.value = theme.value;
                            item.innerHTML = `
                                <span>${theme.display}</span>
                                <button class="favorite-btn" title="收藏/取消收藏">⭐</button>
                            `;

                            const favBtn = item.querySelector('.favorite-btn');
                            if (favorites.includes(theme.value)) {
                                favBtn.classList.add('is-favorite');
                            }

                            // 点击主题项应用主题
                            item.querySelector('span').addEventListener('click', () => {
                                originalSelect.value = theme.value;
                                originalSelect.dispatchEvent(new Event('change'));
                            });
                            
                            // 点击收藏按钮
                            favBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const themeValue = theme.value;
                                if (favorites.includes(themeValue)) {
                                    favorites = favorites.filter(f => f !== themeValue);
                                    favBtn.classList.remove('is-favorite');
                                } else {
                                    favorites.push(themeValue);
                                    favBtn.classList.add('is-favorite');
                                }
                                saveFavorites();
                                // 重绘UI以更新收藏夹分类
                                buildThemeUI();
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
                
                // 搜索功能
                searchBox.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    managerPanel.querySelectorAll('.theme-item').forEach(item => {
                        const themeName = item.querySelector('span').textContent.toLowerCase();
                        const isVisible = themeName.includes(searchTerm);
                        item.style.display = isVisible ? 'flex' : 'none';
                    });
                });

                // 随机主题功能
                randomBtn.addEventListener('click', () => {
                    const allThemeValues = Array.from(originalSelect.options).map(opt => opt.value).filter(Boolean);
                    if (allThemeValues.length > 0) {
                        const randomIndex = Math.floor(Math.random() * allThemeValues.length);
                        const randomTheme = allThemeValues[randomIndex];
                        originalSelect.value = randomTheme;
                        originalSelect.dispatchEvent(new Event('change'));
                    }
                });
                
                originalSelect.addEventListener('change', updateActiveState);
                buildThemeUI();
                console.log("Theme Manager v3.0: 仪表盘初始化成功！");

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
                if(originalSelect) originalSelect.parentElement.style.display = '';
            }
        }
    }, 250);

})();
