(function () {
    'use strict';

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && window.SillyTavern?.getContext && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager (v12.0 Final Perfected): 初始化...");
            clearInterval(initInterval);

            try {
                const { getRequestHeaders, showLoader, hideLoader } = SillyTavern.getContext();
                const FAVORITES_KEY = 'themeManager_favorites';

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
                            try { const errorData = JSON.parse(responseText); throw new Error(errorData.error || `HTTP error! status: ${response.status}`); }
                            catch (e) { throw new Error(responseText || `HTTP error! status: ${response.status}`); }
                        }
                        if (responseText.trim().toUpperCase() === 'OK') return { status: 'OK' };
                        return responseText ? JSON.parse(responseText) : {};
                    } catch (error) {
                        console.error(`API request to /api/${endpoint} failed:`, error);
                        toastr.error(`API请求失败: ${error.message}`);
                        throw error;
                    }
                }
                async function getAllThemesFromAPI() { return (await apiRequest('settings/get', 'POST', {})).themes || []; }
                async function deleteTheme(themeName) { await apiRequest('themes/delete', 'POST', { name: themeName }); }
                async function saveTheme(themeObject) { await apiRequest('themes/save', 'POST', themeObject); }
                function manualUpdateOriginalSelect(action, oldName, newName) {
                    const originalSelect = document.querySelector('#themes');
                    if (!originalSelect) return;
                    if (action === 'add') {
                        const option = document.createElement('option');
                        option.value = newName; option.textContent = newName;
                        originalSelect.appendChild(option);
                    } else if (action === 'delete') {
                        const optionToDelete = originalSelect.querySelector(`option[value="${oldName}"]`);
                        if (optionToDelete) optionToDelete.remove();
                    } else if (action === 'rename') {
                        const optionToRename = originalSelect.querySelector(`option[value="${oldName}"]`);
                        if (optionToRename) { optionToRename.value = newName; optionToRename.textContent = newName; }
                    }
                }

                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.position = 'absolute';
                originalSelect.style.opacity = '0';
                originalSelect.style.pointerEvents = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <h4><span>🎨 主题仪表盘 (完美修复版)</span></h4>
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
                    <div class="theme-content"></div>`;
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
                            let match;
                            while ((match = tagRegex.exec(themeName)) !== null) {
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
                            if (category !== '未分类' && category !== '⭐ 收藏夹') {
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
                                    </div>`;
                                const favBtn = item.querySelector('.favorite-btn');
                                if (favorites.includes(theme.value)) favBtn.classList.add('is-favorite');
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

                async function performBatchRename(renameLogic) {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    showLoader();
                    for (const oldName of selectedForBatch) {
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
                }

                async function performBatchDelete() {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    if (!confirm(`确定要删除选中的 ${selectedForBatch.size} 个主题吗？`)) return;
                    showLoader();
                    for (const themeName of selectedForBatch) {
                        await deleteTheme(themeName);
                        manualUpdateOriginalSelect('delete', themeName);
                    }
                    selectedForBatch.clear();
                    hideLoader();
                    toastr.success('批量删除完成！');
                }

                searchBox.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    managerPanel.querySelectorAll('.theme-item').forEach(item => {
                        const isVisible = item.querySelector('.theme-item-name').textContent.toLowerCase().includes(searchTerm);
                        item.style.display = isVisible ? 'flex' : 'none';
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

                batchEditBtn.addEventListener('click', () => {
                    isBatchEditMode = !isBatchEditMode;
                    contentWrapper.classList.toggle('batch-edit-mode', isBatchEditMode);
                    batchActionsBar.classList.toggle('visible', isBatchEditMode);
                    batchEditBtn.classList.toggle('selected', isBatchEditMode);
                    batchEditBtn.textContent = isBatchEditMode ? '退出批量编辑' : '🔧 批量编辑';
                    selectedForBatch.clear();
                    managerPanel.querySelectorAll('.theme-item-checkbox:checked').forEach(cb => cb.checked = false);
                    managerPanel.querySelectorAll('.selected-for-batch').forEach(item => item.classList.remove('selected-for-batch'));
                });


                document.querySelector('#batch-add-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; } // 把检查移到最前面
                    const newTag = prompt('请输入要添加的新标签：');
                    if (newTag && newTag.trim()) {
                        await performBatchRename(oldName => `[${newTag.trim()}] ${oldName}`);
                        toastr.success(`已为选中主题添加标签 "[${newTag.trim()}]"`);
                    }
                });

                document.querySelector('#batch-move-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; } // 把检查移到最前面
                    const targetTag = prompt('请输入要移动到的目标分类：');
                    if (targetTag && targetTag.trim()) {
                        await performBatchRename(oldName => `[${targetTag.trim()}] ${oldName.replace(/\[.*?\]/g, '').trim()}`);
                        toastr.success(`已将选中主题移动到分类 "[${targetTag.trim()}]"`);
                    }
               });

                document.querySelector('#batch-delete-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; } // 把检查移到最前面
                    const tagToRemove = prompt('请输入要移除的标签：');
                    if (tagToRemove && tagToRemove.trim()) {
                        await performBatchRename(oldName => oldName.replace(`[${tagToRemove.trim()}]`, '').trim());
                        toastr.success(`已从选中主题移除标签 "[${tagToRemove.trim()}]"`);
                    }
               });
                document.querySelector('#batch-delete-btn').addEventListener('click', performBatchDelete);

                // 这是新的、修复后的代码
                contentWrapper.addEventListener('click', async (event) => {
                    const target = event.target;
                    const themeItem = target.closest('.theme-item');
                    const categoryTitle = target.closest('.theme-category-title');

                    // 【核心修复】第一步：无论在哪种模式下，都优先处理文件夹标题的点击
                    if (categoryTitle) {
                        // 如果点击的是解散按钮，单独处理，不触发折叠
                        if (target.matches('.dissolve-folder-btn')) {
                            event.stopPropagation();
                            const categoryName = categoryTitle.closest('.theme-category').dataset.categoryName;
                            if (!confirm(`确定要解散文件夹 "${categoryName}" 吗？`)) return;
                            // ... (后续解散逻辑保持不变)
                            const themesToUpdate = Array.from(originalSelect.options).map(opt => opt.value).filter(name => name.includes(`[${categoryName}]`));
                            showLoader();
                            for (const oldName of themesToUpdate) {
                                const themeObject = allThemeObjects.find(t => t.name === oldName);
                                if (!themeObject) continue;
                                const newName = oldName.replace(`[${categoryName}]`, '').trim();
                                await saveTheme({ ...themeObject, name: newName });
                                await deleteTheme(oldName);
                                manualUpdateOriginalSelect('rename', oldName, newName);
                            }
                            hideLoader();
                            toastr.success(`文件夹 "${categoryName}" 已解散！`);
                            return; // 处理完解散后，直接结束
                        }
        
                        // 如果不是解散按钮，就执行折叠操作
                        const list = categoryTitle.nextElementSibling;
                        if (list) list.style.display = (list.style.display === 'none') ? 'block' : 'none';
                        return; // 处理完折叠后，直接结束，避免干扰后续逻辑
                    }

                    // 第二步：根据是否处于批量编辑模式，来处理主题项的点击
                    if (isBatchEditMode && themeItem) {
                        const checkbox = themeItem.querySelector('.theme-item-checkbox');
                        if (checkbox && !target.matches('input[type="checkbox"]')) checkbox.click();
                    } 
                    else if (!isBatchEditMode && themeItem) {
                   // 非编辑模式下的按钮点击逻辑 (收藏、重命名、删除、应用主题)
                        if (target.matches('.theme-item-name')) {
                            originalSelect.value = themeItem.dataset.value;
                            originalSelect.dispatchEvent(new Event('change'));
                        }
                        else if (target.matches('.favorite-btn')) {
                            const themeName = themeItem.dataset.value;
                            favorites = favorites.includes(themeName) ? favorites.filter(f => f !== themeName) : [...favorites, themeName];
                            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                            await buildThemeUI();
                        }
                        else if (target.matches('.rename-btn')) {
                            const oldName = themeItem.dataset.value;
                            const newName = prompt(`请输入新名称：`, oldName);
                            if (newName && newName !== oldName) {
                                const themeObject = allThemeObjects.find(t => t.name === oldName);
                                if (!themeObject) return;
                                await saveTheme({ ...themeObject, name: newName });
                                await deleteTheme(oldName);

                                toastr.success(`主题已重命名为 "${newName}"！`);
                                manualUpdateOriginalSelect('rename', oldName, newName);
                            }
                        }
                        else if (target.matches('.delete-btn')) {
                            const themeName = themeItem.dataset.value;
                            if (confirm(`确定要删除主题 "${themeItem.querySelector('.theme-item-name').textContent}" 吗？`)) {
                                await deleteTheme(themeName);
                                toastr.success(`主题 "${themeItem.querySelector('.theme-item-name').textContent}" 已删除！`);
                                manualUpdateOriginalSelect('delete', themeName);
                            }
                        }
                    }
                });

                contentWrapper.addEventListener('change', (event) => {
                    const target = event.target;
                    if (target.matches('.theme-item-checkbox')) {
                        const themeItem = target.closest('.theme-item');
                        const themeName = themeItem.dataset.value;
                        if (target.checked) {
                            selectedForBatch.add(themeName);
                            themeItem.classList.add('selected-for-batch');
                        } else {
                            selectedForBatch.delete(themeName);
                            themeItem.classList.remove('selected-for-batch');
                        }
                    }
                });

                const observer = new MutationObserver((mutations) => {
                    for (let mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            const newNode = mutation.addedNodes[0];
                            if (newNode.tagName === 'OPTION' && newNode.value) {
                                toastr.success(`已另存为新主题: "${newNode.value}"`);
                                break;
                            }
                        }
                    }
                    buildThemeUI();
                });
                observer.observe(originalSelect, { childList: true, subtree: true, characterData: true });

                buildThemeUI();

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
            }
        }
    }, 250);
})();


