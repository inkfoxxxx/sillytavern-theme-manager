(function () {
    'use strict';

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');
        const updateButton = document.querySelector('#ui-preset-update-button');
        const saveAsButton = document.querySelector('#ui-preset-save-button');

        if (originalSelect && updateButton && saveAsButton && window.SillyTavern?.getContext && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager (v18.0 Final Star Polished): 初始化...");
            clearInterval(initInterval);

            try {
                const { getRequestHeaders, showLoader, hideLoader } = SillyTavern.getContext();
                const FAVORITES_KEY = 'themeManager_favorites';
                const COLLAPSE_KEY = 'themeManager_collapsed';

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
                originalSelect.style.display = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <div id="theme-manager-header">
                        <h4>🎨 主题仪表盘</h4>
                        <div id="native-buttons-container"></div>
                        <div id="theme-manager-toggle-icon" class="fa-solid fa-chevron-down"></div>
                    </div>
                    <div id="theme-manager-content">
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
                    </div>`;
                originalContainer.prepend(managerPanel);

                const nativeButtonsContainer = managerPanel.querySelector('#native-buttons-container');
                nativeButtonsContainer.appendChild(updateButton);
                nativeButtonsContainer.appendChild(saveAsButton);

                const header = managerPanel.querySelector('#theme-manager-header');
                const content = managerPanel.querySelector('#theme-manager-content');
                const toggleIcon = managerPanel.querySelector('#theme-manager-toggle-icon');
                const batchEditBtn = managerPanel.querySelector('#batch-edit-btn');
                const batchActionsBar = managerPanel.querySelector('#batch-actions-bar');
                const contentWrapper = managerPanel.querySelector('.theme-content');
                const searchBox = managerPanel.querySelector('#theme-search-box');
                const randomBtn = managerPanel.querySelector('#random-theme-btn');

                let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
                let allThemeObjects = [];
                let isBatchEditMode = false;
                let selectedForBatch = new Set();

                function setCollapsed(isCollapsed, animate = false) {
                    if (isCollapsed) {
                        if (animate) {
                            content.style.maxHeight = content.scrollHeight + 'px';
                            requestAnimationFrame(() => {
                                content.style.maxHeight = '0px';
                                content.style.paddingTop = '0px';
                                content.style.paddingBottom = '0px';
                            });
                        } else {
                            content.style.maxHeight = '0px';
                            content.style.paddingTop = '0px';
                            content.style.paddingBottom = '0px';
                        }
                        toggleIcon.classList.add('collapsed');
                        localStorage.setItem(COLLAPSE_KEY, 'true');
                    } else {
                        content.style.paddingTop = '';
                        content.style.paddingBottom = '';
                        if (animate) {
                            content.style.maxHeight = content.scrollHeight + 'px';
                            setTimeout(() => { content.style.maxHeight = ''; }, 300);
                        } else {
                            content.style.maxHeight = '';
                        }
                        toggleIcon.classList.remove('collapsed');
                        localStorage.setItem(COLLAPSE_KEY, 'false');
                    }
                }

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
                            displayName = themeName.replace(/\[.*?\]/g, '').trim() || themeName;
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

                                const isFavorited = favorites.includes(theme.value);
                                const starIconClass = isFavorited ? 'fa-solid' : 'fa-regular';

                                item.innerHTML = `
                                    <span class="theme-item-name">${theme.display}</span>
                                    <div class="theme-item-buttons">
                                        <button class="favorite-btn" title="收藏">
                                            <i class="${starIconClass} fa-star"></i>
                                        </button>
                                        <button class="rename-btn" title="重命名"><i class="fa-solid fa-pencil"></i></button>
                                        <button class="delete-btn" title="删除"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>`;
                                
                                if (isFavorited) {
                                    item.querySelector('.favorite-btn').classList.add('is-favorite');
                                }
                                list.appendChild(item);
                            });

                            categoryDiv.appendChild(title);
                            categoryDiv.appendChild(list);
                            contentWrapper.appendChild(categoryDiv);
                        });
                        contentWrapper.scrollTop = scrollTop;
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

                header.addEventListener('click', (e) => {
                    if (e.target.closest('#native-buttons-container')) return;
                    setCollapsed(content.style.maxHeight !== '0px', true);
                });

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
                    managerPanel.classList.toggle('batch-edit-mode', isBatchEditMode);
                    batchActionsBar.classList.toggle('visible', isBatchEditMode);
                    batchEditBtn.classList.toggle('selected', isBatchEditMode);
                    batchEditBtn.textContent = isBatchEditMode ? '退出批量编辑' : '🔧 批量编辑';
                    if (!isBatchEditMode) {
                        selectedForBatch.clear();
                        managerPanel.querySelectorAll('.selected-for-batch').forEach(item => item.classList.remove('selected-for-batch'));
                    }
                });

                document.querySelector('#batch-add-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    const newTag = prompt('请输入要添加的新标签：');
                    if (newTag && newTag.trim()) {
                        await performBatchRename(oldName => `[${newTag.trim()}] ${oldName}`);
                        toastr.success(`已为选中主题添加标签 "[${newTag.trim()}]"`);
                    }
                });
                document.querySelector('#batch-move-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    const targetTag = prompt('请输入要移动到的目标分类：');
                    if (targetTag && targetTag.trim()) {
                         await performBatchRename(oldName => `[${targetTag.trim()}] ${oldName.replace(/\[.*?\]/g, '').trim()}`);
                         toastr.success(`已将选中主题移动到分类 "[${targetTag.trim()}]"`);
                    }
                });
                document.querySelector('#batch-delete-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    const tagToRemove = prompt('请输入要移除的标签：');
                    if (tagToRemove && tagToRemove.trim()) {
                        await performBatchRename(oldName => oldName.replace(`[${tagToRemove.trim()}]`, '').trim());
                        toastr.success(`已从选中主题移除标签 "[${tagToRemove.trim()}]"`);
                    }
                });
                document.querySelector('#batch-delete-btn').addEventListener('click', performBatchDelete);

                contentWrapper.addEventListener('click', async (event) => {
                    const target = event.target;
                    const button = target.closest('button');
                    const themeItem = target.closest('.theme-item');
                    const categoryTitle = target.closest('.theme-category-title');

                    if (categoryTitle) {
                        if (button && button.classList.contains('dissolve-folder-btn')) {
                            event.stopPropagation();
                            const categoryName = categoryTitle.closest('.theme-category').dataset.categoryName;
                            if (!confirm(`确定要解散文件夹 "${categoryName}" 吗？`)) return;
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
                        } else {
                            const list = categoryTitle.nextElementSibling;
                            if (list) list.style.display = (list.style.display === 'none') ? 'block' : 'none';
                        }
                        return;
                    }

                    if (!themeItem) return;

                    const themeName = themeItem.dataset.value;

                    if (isBatchEditMode) {
                        if (selectedForBatch.has(themeName)) {
                            selectedForBatch.delete(themeName);
                            themeItem.classList.remove('selected-for-batch');
                        } else {
                            selectedForBatch.add(themeName);
                            themeItem.classList.add('selected-for-batch');
                        }
                    } else {
                        if (button && button.classList.contains('favorite-btn')) {
                            const starIcon = button.querySelector('i.fa-star');
                            if (favorites.includes(themeName)) {
                                favorites = favorites.filter(f => f !== themeName);
                                starIcon.classList.remove('fa-solid');
                                starIcon.classList.add('fa-regular');
                                button.classList.remove('is-favorite');
                            } else {
                                favorites.push(themeName);
                                starIcon.classList.remove('fa-regular');
                                starIcon.classList.add('fa-solid');
                                button.classList.add('is-favorite');
                            }
                            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                            await buildThemeUI();
                        }
                        else if (button && button.classList.contains('rename-btn')) {
                            const oldName = themeName;
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
                        else if (button && button.classList.contains('delete-btn')) {
                            if (confirm(`确定要删除主题 "${themeItem.querySelector('.theme-item-name').textContent}" 吗？`)) {
                                await deleteTheme(themeName);
                                toastr.success(`主题 "${themeItem.querySelector('.theme-item-name').textContent}" 已删除！`);
                                manualUpdateOriginalSelect('delete', themeName);
                            }
                        } else if (target.matches('.theme-item-name')) {
                            originalSelect.value = themeName;
                            originalSelect.dispatchEvent(new Event('change'));
                        }
                    }
                });

                originalSelect.addEventListener('change', updateActiveState);

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

                buildThemeUI().then(() => {
                    const isInitiallyCollapsed = localStorage.getItem(COLLAPSE_KEY) === 'true';
                    setCollapsed(isInitiallyCollapsed, false);
                });

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
            }
        }
    }, 250);
})();
