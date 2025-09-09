(function () {
    'use strict';

    const { getRequestHeaders } = SillyTavern.getContext();

    const FAVORITES_KEY = 'themeManager_favorites';

    async function apiRequest(endpoint, method = 'POST', body = {}) {
        // ... (apiRequest 函数保持不变，此处省略以节省空间) ...
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

    function manualUpdateOriginalSelect(action, oldName, newName) {
        const originalSelect = document.querySelector('#themes');
        if (!originalSelect) return;

        switch (action) {
            case 'add':
                const option = document.createElement('option');
                option.value = newName;
                option.textContent = newName;
                originalSelect.appendChild(option);
                toastr.success(`已另存为新主题: "${newName}"`); // 新增提示！
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
            console.log("Theme Manager (v5.0 Batch Mode): 找到了目标元素，开始初始化...");
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
                    <h4><span>🎨 主题仪表盘 (批量版)</span></h4>
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
                    contentWrapper.innerHTML = '正在加载主题...';
                    try {
                        allThemeObjects = await getAllThemesFromAPI();
                        contentWrapper.innerHTML = '';
                        
                        // ... (buildThemeUI 内部的列表生成逻辑大部分保持不变，但需要为每个 item 添加 checkbox) ...
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
                                    <input type="checkbox" class="theme-item-checkbox">
                                    <span class="theme-item-name">${theme.display}</span>
                                    <div class="theme-item-buttons">
                                        <button class="favorite-btn" title="收藏">⭐</button>
                                        <button class="rename-btn" title="重命名">✏️</button>
                                        <button class="delete-btn" title="删除">🗑️</button>
                                    </div>
                                `;
                                
                                // ... (单个按钮的事件绑定逻辑保持不变) ...
                                item.querySelector('.theme-item-name').addEventListener('click', () => { /* ... */ });
                                item.querySelector('.favorite-btn').addEventListener('click', (e) => { /* ... */ });
                                item.querySelector('.rename-btn').addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    const oldName = theme.value;
                                    const newName = prompt(`请输入 "${theme.display}" 的新名称：`, oldName);
                                    if (newName && newName !== oldName) {
                                        const themeObject = allThemeObjects.find(t => t.name === oldName);
                                        if (!themeObject) { toastr.error('找不到原始主题对象！'); return; }
                                        const newThemeObject = { ...themeObject, name: newName };
                                        await saveTheme(newThemeObject);
                                        await deleteTheme(oldName);
                                        toastr.success(`主题已重命名为 "${newName}"！`);
                                        manualUpdateOriginalSelect('rename', oldName, newName);
                                        // buildThemeUI will be triggered by observer
                                    }
                                });
                                item.querySelector('.delete-btn').addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    const themeName = theme.value;
                                    if (confirm(`确定要删除主题 "${theme.display}" 吗？`)) {
                                        await deleteTheme(themeName);
                                        toastr.success(`主题 "${theme.display}" 已删除！`);
                                        manualUpdateOriginalSelect('delete', themeName, null);
                                        // buildThemeUI will be triggered by observer
                                    }
                                });

                                // 新增：多选框逻辑
                                const checkbox = item.querySelector('.theme-item-checkbox');
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
                        
                    } catch (err) {
                        contentWrapper.innerHTML = '加载主题失败，请检查浏览器控制台获取更多信息。';
                    }
                }

                // 批量编辑模式切换
                batchEditBtn.addEventListener('click', () => {
                    isBatchEditMode = !isBatchEditMode;
                    managerPanel.classList.toggle('batch-edit-mode', isBatchEditMode);
                    batchActionsBar.classList.toggle('visible', isBatchEditMode);
                    batchEditBtn.classList.toggle('selected', isBatchEditMode);
                    selectedForBatch.clear();
                    // 取消所有勾选和高亮
                    managerPanel.querySelectorAll('.theme-item-checkbox').forEach(cb => cb.checked = false);
                    managerPanel.querySelectorAll('.theme-item').forEach(item => item.classList.remove('selected-for-batch'));
                });

                // 批量操作的实现
                async function performBatchRename(renameLogic) {
                    if (selectedForBatch.size === 0) {
                        toastr.info('请先选择至少一个主题。');
                        return;
                    }
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
                    toastr.success('批量操作完成！');
                    selectedForBatch.clear();
                    // buildThemeUI will be triggered by observer
                }

                document.querySelector('#batch-add-tag-btn').addEventListener('click', async () => {
                    const newTag = prompt('请输入要为选中主题添加的新标签（文件夹名）：');
                    if (!newTag || !newTag.trim()) return;
                    await performBatchRename(oldName => {
                        if (oldName.includes(`[${newTag}]`)) return oldName; // 避免重复添加
                        return `[${newTag}] ${oldName}`;
                    });
                });

                document.querySelector('#batch-move-tag-btn').addEventListener('click', async () => {
                    const targetTag = prompt('请输入要把选中主题移动到的目标分类（文件夹名）：');
                    if (!targetTag || !targetTag.trim()) return;
                    await performBatchRename(oldName => {
                        const displayName = oldName.replace(/\[(.*?)\]/g, '').trim();
                        return `[${targetTag}] ${displayName}`;
                    });
                });

                document.querySelector('#batch-delete-tag-btn').addEventListener('click', async () => {
                    const tagToRemove = prompt('请输入要从选中主题中移除的标签（文件夹名）：');
                    if (!tagToRemove || !tagToRemove.trim()) return;
                    await performBatchRename(oldName => {
                        return oldName.replace(`[${tagToRemove}]`, '').trim();
                    });
                });

                document.querySelector('#batch-delete-btn').addEventListener('click', async () => {
                     if (selectedForBatch.size === 0) {
                        toastr.info('请先选择至少一个主题。');
                        return;
                    }
                    if (!confirm(`确定要删除选中的 ${selectedForBatch.size} 个主题吗？此操作无法撤销。`)) return;
                    const selectedArray = Array.from(selectedForBatch);
                    for (const themeName of selectedArray) {
                         await deleteTheme(themeName);
                         manualUpdateOriginalSelect('delete', themeName, null);
                    }
                    toastr.success('批量删除完成！');
                    selectedForBatch.clear();
                    // buildThemeUI will be triggered by observer
                });

                // ... (其他事件绑定，如搜索、随机等保持不变) ...

                // 监听DOM变化，以应对原生“另存为”等操作
                const observer = new MutationObserver((mutations) => {
                    // 这是一个简化的通知，我们只关心是否有option被添加
                    for(let mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            const newNode = mutation.addedNodes[0];
                            // 检查确保它是一个option元素并且有值
                            if (newNode.tagName === 'OPTION' && newNode.value) {
                                toastr.success(`已另存为新主题: "${newNode.value}"`);
                                break; 
                            }
                        }
                    }
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
