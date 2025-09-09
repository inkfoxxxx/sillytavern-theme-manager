(function () {
    'use strict';

    const { getRequestHeaders } = SillyTavern.getContext();

    const FAVORITES_KEY = 'themeManager_favorites';

    // ... (apiRequest, getAllThemesFromAPI, deleteTheme, saveTheme 函数保持不变) ...
    async function apiRequest(endpoint, method = 'POST', body = {}) { /* ... */ }
    async function getAllThemesFromAPI() { /* ... */ }
    async function deleteTheme(themeName) { /* ... */ }
    async function saveTheme(themeObject) { /* ... */ }

    // ... (manualUpdateOriginalSelect 函数保持不变) ...
    function manualUpdateOriginalSelect(action, oldName, newName) { /* ... */ }

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager (v6.0 UX-Optimized): 找到了目标元素，开始初始化...");
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

                let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
                let allThemeObjects = [];
                let isBatchEditMode = false;
                let selectedForBatch = new Set();

                async function buildThemeUI() {
                    const scrollTop = contentWrapper.scrollTop; // 保存滚动位置
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
                            let match;
                            while ((match = tagRegex.exec(themeName)) !== null) {
                                if (match[1].trim()) tags.push(match[1].trim());
                            }
                            displayName = themeName.replace(tagRegex, '').trim();
                            if (tags.length === 0) tags.push('未分类');
                            return { value: themeName, display: displayName, tags: tags };
                        }).filter(Boolean);
                        
                        const allCategories = new Set(allThemes.flatMap(t => t.tags));
                        const sortedCategories = ['⭐ 收藏夹', ...Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
    
                        sortedCategories.forEach(category => {
                            const themesInCategory = (category === '⭐ 收藏夹') ? allThemes.filter(t => favorites.includes(t.value)) : allThemes.filter(t => t.tags.includes(category));
                            if (themesInCategory.length === 0 && category !== '未分类') return;
    
                            const categoryDiv = document.createElement('div');
                            categoryDiv.className = 'theme-category';
                            const title = document.createElement('div');
                            title.className = 'theme-category-title';
                            title.innerHTML = `<span>${category}</span>`;
                            // 新增：解散文件夹按钮
                            if(category !== '未分类' && category !== '⭐ 收藏夹'){
                                title.innerHTML += `<button class="dissolve-folder-btn" title="解散此文件夹（移除所有成员的这个标签）">解散</button>`;
                            }

                            const list = document.createElement('ul');
                            list.className = 'theme-list';
                            list.style.display = 'block';
                            title.querySelector('span').addEventListener('click', () => list.style.display = (list.style.display === 'none') ? 'block' : 'none');
    
                            // 新增：解散文件夹事件
                            const dissolveBtn = title.querySelector('.dissolve-folder-btn');
                            if(dissolveBtn){
                                dissolveBtn.addEventListener('click', async(e)=>{
                                    e.stopPropagation();
                                    if(!confirm(`确定要解散文件夹 "${category}" 吗？\n这将会移除该分类下所有主题的 [${category}] 标签。`)) return;

                                    const themesToUpdate = themesInCategory.map(t => t.value);
                                    for (const oldName of themesToUpdate) {
                                        const themeObject = allThemeObjects.find(t => t.name === oldName);
                                        if (!themeObject) continue;
                                        const newName = oldName.replace(`[${category}]`, '').trim();
                                        if (newName !== oldName) {
                                            const newThemeObject = { ...themeObject, name: newName };
                                            await saveTheme(newThemeObject);
                                            await deleteTheme(oldName);
                                            manualUpdateOriginalSelect('rename', oldName, newName);
                                        }
                                    }
                                    toastr.success(`文件夹 "${category}" 已解散！`);
                                    // buildThemeUI 会被 observer 触发
                                });
                            }

                            themesInCategory.forEach(theme => {
                                const item = document.createElement('li');
                                item.className = 'theme-item';
                                item.dataset.value = theme.value;
                                // 核心修复：为 item 绑定点击事件以扩大选择区域
                                item.addEventListener('click', (e) => {
                                    if (isBatchEditMode) {
                                        // 如果点击的是 checkbox 以外的区域，则手动触发 checkbox 的点击
                                        if (e.target.type !== 'checkbox') {
                                            checkbox.click();
                                        }
                                    } else {
                                        // 核心修复：在非编辑模式下，点击名称区域应用主题
                                        if(e.target.classList.contains('theme-item-name')){
                                            originalSelect.value = theme.value;
                                            originalSelect.dispatchEvent(new Event('change'));
                                        }
                                    }
                                });

                                item.innerHTML = `
                                    <input type="checkbox" class="theme-item-checkbox">
                                    <span class="theme-item-name">${theme.display}</span>
                                    <div class="theme-item-buttons">
                                        <button class="favorite-btn" title="收藏">⭐</button>
                                        <button class="rename-btn" title="重命名">✏️</button>
                                        <button class="delete-btn" title="删除">🗑️</button>
                                    </div>
                                `;
                                
                                const checkbox = item.querySelector('.theme-item-checkbox');
                                const favBtn = item.querySelector('.favorite-btn');
                                
                                // 核心修复：恢复收藏功能
                                favBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    if (favorites.includes(theme.value)) {
                                        favorites = favorites.filter(f => f !== theme.value);
                                    } else {
                                        favorites.push(theme.value);
                                    }
                                    saveFavorites();
                                    buildThemeUI(); // 重绘UI以更新收藏夹
                                });

                                // ... (其他按钮的事件绑定逻辑保持不变) ...
                                item.querySelector('.rename-btn').addEventListener('click', async (e) => { /* ... */ });
                                item.querySelector('.delete-btn').addEventListener('click', async (e) => { /* ... */ });
                                
                                checkbox.addEventListener('change', () => {
                                    if (checkbox.checked) {
                                        selectedForBatch.add(theme.value);
                                        item.classList.add('selected-for-batch');
                                    } else {
                                        selectedForBatch.delete(theme.value);
                                        item.classList.remove('selected-for-batch');
                                    }
                                });
                                
                                list.appendChild(item);
                            });
                            
                            categoryDiv.appendChild(title);
                            categoryDiv.appendChild(list);
                            contentWrapper.appendChild(categoryDiv);
                        });
                        contentWrapper.scrollTop = scrollTop; // 恢复滚动位置
                    } catch (err) {
                        contentWrapper.innerHTML = '加载主题失败，请检查浏览器控制台获取更多信息。';
                    }
                }

                // 批量操作的实现
                async function performBatchRename(renameLogic) {
                    if (selectedForBatch.size === 0) {
                        toastr.info('请先选择至少一个主题。');
                        return false;
                    }
                    showLoader();
                    const selectedArray = Array.from(selectedForBatch);
                    for (const oldName of selectedArray) {
                        const themeObject = allThemeObjects.find(t => t.name === oldName);
                        if (!themeObject) continue;
                        const newName = renameLogic(oldName);
                        if (newName !== oldName) {
                            const newThemeObject = { ...themeObject, name: newName };
                            await saveTheme(newThemeObject);
                            await deleteTheme(oldName);
                            manualUpdateOriginalSelect('rename', oldName, newName);
                        }
                    }
                    selectedForBatch.clear();
                    hideLoader();
                    return true;
                }

                document.querySelector('#batch-add-tag-btn').addEventListener('click', async () => { /* ... */ });

                // 新增：可视化的移动到分类
                document.querySelector('#batch-move-tag-btn').addEventListener('click', async () => {
                    const allExistingTags = Array.from(new Set(allThemeObjects.flatMap(t => t.name.match(/\[(.*?)\]/g) || []).map(tag => tag.slice(1, -1))));
                    let optionsHTML = allExistingTags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
                    const newFolderName = prompt(`请选择或输入要移动到的目标分类（文件夹名）：\n\n已有分类：${allExistingTags.join(', ')}`);
                    
                    if (!newFolderName || !newFolderName.trim()) return;
                    const success = await performBatchRename(oldName => {
                        const displayName = oldName.replace(/\[(.*?)\]/g, '').trim();
                        return `[${newFolderName}] ${displayName}`;
                    });
                    if(success) toastr.success(`已将选中主题移动到 "${newFolderName}" 分类！`);
                });

                // ... (其他批量操作按钮事件绑定) ...

                const observer = new MutationObserver((mutations) => {
                    for(let mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            const newNode = mutation.addedNodes[0];
                            if (newNode.tagName === 'OPTION' && newNode.value) {
                                toastr.success(`已另存为新主题: "${newNode.value}"`);
                                break; 
                            }
                        }
                    }
                    // 核心修复：无论如何都刷新UI，以应对原生“另存为”等外部变化
                    buildThemeUI();
                });
                observer.observe(originalSelect, { childList: true });

                buildThemeUI();
                
            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
            }
        }
    }, 250);
})();
