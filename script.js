(function () {
    'use strict';

    const { getRequestHeaders } = SillyTavern.getContext();
    const FAVORITES_KEY = 'themeManager_favorites';

    // ... (API 函数保持不变) ...
    async function apiRequest(endpoint, method = 'POST', body = {}) { /* ... */ }
    async function getAllThemesFromAPI() { /* ... */ }
    async function deleteTheme(themeName) { /* ... */ }
    async function saveTheme(themeObject) { /* ... */ }
    function manualUpdateOriginalSelect(action, oldName, newName) { /* ... */ }

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager (v7.0 Final Fix): 初始化...");
            clearInterval(initInterval);

            try {
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.position = 'absolute';
                originalSelect.style.opacity = '0';
                originalSelect.style.pointerEvents = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <h4><span>🎨 主题仪表盘</span></h4>
                    <div class="theme-manager-actions">
                        <input type="search" id="theme-search-box" placeholder="🔍 搜索主题...">
                        <button id="random-theme-btn" title="随机应用一个主题">🎲 随机</button>
                        <button id="batch-edit-btn" title="进入/退出批量编辑模式">🔧 批量编辑</button>
                    </div>
                    <div id="batch-actions-bar">
                        <button id="batch-add-tag-btn">➕ 添加标签</button>
                        <button id="batch-move-tag-btn">➡️ 移动到分类</button>
                        <button id="batch-delete-tag-btn">❌ 移除标签</button>
                        <button id="batch-delete-btn">🗑️ 删除选中</button>
                    </div>
                    <div class="theme-content"></div>
                `;
                originalContainer.prepend(managerPanel);
                
                const batchEditBtn = managerPanel.querySelector('#batch-edit-btn');
                const batchActionsBar = managerPanel.querySelector('#batch-actions-bar');
                const contentWrapper = managerPanel.querySelector('.theme-content');
                const searchBox = managerPanel.querySelector('#theme-search-box');
                const randomBtn = managerPanel.querySelector('#random-theme-btn');

                let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
                let allThemeObjects = [];
                let isBatchEditMode = false;
                let selectedForBatch = new Set();

                async function buildThemeUI() {
                    const scrollTop = contentWrapper.scrollTop;
                    contentWrapper.innerHTML = '正在加载主题...';
                    try {
                        allThemeObjects = await getAllThemesFromAPI();
                        contentWrapper.innerHTML = '';
                        
                        const allThemes = Array.from(originalSelect.options).map(option => {
                            const themeName = option.value;
                            if (!themeName) return null;
                            let displayName = themeName;
                            const tags = [];
                            const tagRegex = /\[(.*?)\]/g;
                            while (true) {
                                const match = tagRegex.exec(themeName);
                                if (!match) break;
                                if (match[1].trim()) tags.push(match[1].trim());
                            }
                            displayName = themeName.replace(/\[.*?\]/g, '').trim();
                            if (tags.length === 0) tags.push('未分类');
                            return { value: themeName, display: displayName, tags: tags };
                        }).filter(Boolean);
                        
                        const allCategories = new Set(allThemes.flatMap(t => t.tags));
                        const sortedCategories = ['⭐ 收藏夹', ...Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
    
                        sortedCategories.forEach(category => {
                            const themesInCategory = (category === '⭐ 收藏夹') ? allThemes.filter(t => favorites.includes(t.value)) : allThemes.filter(t => t.tags.includes(category));
                            if (themesInCategory.length === 0 && category !== '未分类' && category !== '⭐ 收藏夹') return;
    
                            const categoryDiv = document.createElement('div');
                            categoryDiv.className = 'theme-category';
                            categoryDiv.dataset.categoryName = category;
                            const title = document.createElement('div');
                            title.className = 'theme-category-title';
                            title.innerHTML = `<span>${category}</span>`;
                            if(category !== '未分类' && category !== '⭐ 收藏夹'){
                                title.innerHTML += `<button class="dissolve-folder-btn" title="解散此文件夹">解散</button>`;
                            }

                            const list = document.createElement('ul');
                            list.className = 'theme-list';
                            list.style.display = 'block';
    
                            themesInCategory.forEach(theme => {
                                const item = document.createElement('li');
                                item.className = 'theme-item';
                                item.dataset.value = theme.value;
                                item.innerHTML = `
                                    <input type="checkbox" class="theme-item-checkbox">
                                    <span class="theme-item-name">${theme.display}</span>
                                    <div class="theme-item-buttons">
                                        <button class="favorite-btn" title="收藏">⭐</button>
                                        <button class="rename-btn" title="重命名">✏️</button>
                                        <button class="delete-btn" title="删除">🗑️</button>
                                    </div>
                                `;
                                list.appendChild(item);
                            });
                            
                            categoryDiv.appendChild(title);
                            categoryDiv.appendChild(list);
                            contentWrapper.appendChild(categoryDiv);
                        });
                        contentWrapper.scrollTop = scrollTop;
                    } catch (err) {
                        contentWrapper.innerHTML = '加载主题失败，请检查浏览器控制台获取更多信息。';
                    }
                }

                // 【核心修复】使用事件委托来处理所有动态生成的按钮
                contentWrapper.addEventListener('click', async (event) => {
                    const target = event.target;
                    const themeItem = target.closest('.theme-item');
                    const categoryTitle = target.closest('.theme-category-title');

                    if (isBatchEditMode) {
                        if (themeItem) { // 点击整行来切换勾选
                            const checkbox = themeItem.querySelector('.theme-item-checkbox');
                            if (checkbox && target.type !== 'checkbox') {
                                checkbox.click();
                            }
                        }
                    } else {
                        // 非编辑模式下的操作
                        if (target.classList.contains('theme-item-name')) {
                            originalSelect.value = themeItem.dataset.value;
                            originalSelect.dispatchEvent(new Event('change'));
                        } else if (target.classList.contains('favorite-btn')) {
                            event.stopPropagation();
                            const themeName = themeItem.dataset.value;
                            if (favorites.includes(themeName)) {
                                favorites = favorites.filter(f => f !== themeName);
                            } else {
                                favorites.push(themeName);
                            }
                            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                            await buildThemeUI();
                        } else if (target.classList.contains('rename-btn')) {
                            event.stopPropagation();
                            const oldName = themeItem.dataset.value;
                            const themeDisplayName = themeItem.querySelector('.theme-item-name').textContent;
                            const newName = prompt(`请输入 "${themeDisplayName}" 的新名称：`, oldName);
                            if (newName && newName !== oldName) {
                                const themeObject = allThemeObjects.find(t => t.name === oldName);
                                if (!themeObject) return;
                                const newThemeObject = { ...themeObject, name: newName };
                                await saveTheme(newThemeObject);
                                await deleteTheme(oldName);
                                toastr.success(`主题已重命名为 "${newName}"！`);
                                manualUpdateOriginalSelect('rename', oldName, newName);
                            }
                        } else if (target.classList.contains('delete-btn')) {
                            event.stopPropagation();
                            const themeName = themeItem.dataset.value;
                            const themeDisplayName = themeItem.querySelector('.theme-item-name').textContent;
                            if (confirm(`确定要删除主题 "${themeDisplayName}" 吗？`)) {
                                await deleteTheme(themeName);
                                toastr.success(`主题 "${themeDisplayName}" 已删除！`);
                                manualUpdateOriginalSelect('delete', themeName);
                            }
                        } else if (target.classList.contains('dissolve-folder-btn')) {
                            event.stopPropagation();
                            const categoryName = target.closest('.theme-category').dataset.categoryName;
                            if (!confirm(`确定要解散文件夹 "${categoryName}" 吗？`)) return;
                            
                            const themesToUpdate = Array.from(originalSelect.options)
                                .map(opt => opt.value)
                                .filter(name => name.includes(`[${categoryName}]`));
                            
                            for (const oldName of themesToUpdate) {
                                const themeObject = allThemeObjects.find(t => t.name === oldName);
                                if (!themeObject) continue;
                                const newName = oldName.replace(`[${categoryName}]`, '').trim();
                                const newThemeObject = { ...themeObject, name: newName };
                                await saveTheme(newThemeObject);
                                await deleteTheme(oldName);
                                manualUpdateOriginalSelect('rename', oldName, newName);
                            }
                            toastr.success(`文件夹 "${categoryName}" 已解散！`);
                        } else if (categoryTitle) { // 核心修复：整个标题行都可以折叠
                            const list = categoryTitle.nextElementSibling;
                            if(list) list.style.display = (list.style.display === 'none') ? 'block' : 'none';
                        }
                    }
                });

                // 批量编辑模式切换
                batchEditBtn.addEventListener('click', () => {
                    isBatchEditMode = !isBatchEditMode;
                    contentWrapper.classList.toggle('batch-edit-mode', isBatchEditMode);
                    batchActionsBar.classList.toggle('visible', isBatchEditMode);
                    batchEditBtn.classList.toggle('selected', isBatchEditMode);
                    batchEditBtn.textContent = isBatchEditMode ? '退出批量编辑' : '🔧 批量编辑';
                    selectedForBatch.clear();
                    managerPanel.querySelectorAll('.theme-item-checkbox').forEach(cb => cb.checked = false);
                    managerPanel.querySelectorAll('.theme-item').forEach(item => item.classList.remove('selected-for-batch'));
                });

                // 批量操作的实现
                async function performBatchRename(renameLogic) { /* ... 保持不变 ... */ }
                // ... (所有批量操作按钮的事件绑定保持不变) ...

                const observer = new MutationObserver(() => { buildThemeUI(); });
                observer.observe(originalSelect, { childList: true });

                buildThemeUI();
                
            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
            }
        }
    }, 250);
})();
