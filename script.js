(function () {
    'use strict';

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');
        const updateButton = document.querySelector('#ui-preset-update-button');
        const saveAsButton = document.querySelector('#ui-preset-save-button');

        if (originalSelect && updateButton && saveAsButton && window.SillyTavern?.getContext && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager (v22.1 Final Refresh Fix): 初始化...");
            clearInterval(initInterval);

            try {
                const { getRequestHeaders, showLoader, hideLoader, reloadThemes } = SillyTavern.getContext();
                const FAVORITES_KEY = 'themeManager_favorites';
                const COLLAPSE_KEY = 'themeManager_collapsed';
                const THEME_BACKGROUND_BINDINGS_KEY = 'themeManager_backgroundBindings';

                let allParsedThemes = []; 
                let themeBackgroundBindings = JSON.parse(localStorage.getItem(THEME_BACKGROUND_BINDINGS_KEY)) || {};
                let isBindingMode = false; 
                let themeNameToBind = null;

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
                
                function getTagsFromThemeName(themeName) {
                    const tags = [];
                    const tagRegex = /\[(.*?)\]/g;
                    let match;
                    while ((match = tagRegex.exec(themeName)) !== null) {
                        if (match[1].trim()) tags.push(match[1].trim());
                    }
                    if (tags.length === 0) tags.push('未分类');
                    return tags;
                }
                
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.display = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <div id="theme-manager-header">
                        <h4>🎨 主题美化管理</h4>
                        <div id="native-buttons-container"></div>
                        <div id="theme-manager-toggle-icon" class="fa-solid fa-chevron-down"></div>
                    </div>
                    <div id="theme-manager-content">
                        <div class="theme-manager-actions">
                            <input type="search" id="theme-search-box" placeholder="🔍 搜索主题...">
                            <button id="random-theme-btn" title="随机应用一个主题">🎲 随机</button>
                            <button id="batch-edit-btn" title="进入/退出批量编辑模式">🔧 批量编辑</button>
                            <button id="batch-import-btn" title="从文件批量导入主题">📂 批量导入</button>
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
                const batchImportBtn = managerPanel.querySelector('#batch-import-btn');

                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.multiple = true;
                fileInput.accept = '.json';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);

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
                    contentWrapper.innerHTML = '正在加载主题...';
                    try {
                        allThemeObjects = await getAllThemesFromAPI();
                        contentWrapper.innerHTML = '';

                        allParsedThemes = Array.from(originalSelect.options).map(option => {
                            const themeName = option.value;
                            if (!themeName) return null;
                            const tags = getTagsFromThemeName(themeName);
                            const displayName = themeName.replace(/\[.*?\]/g, '').trim() || themeName;
                            return { value: themeName, display: displayName, tags: tags };
                        }).filter(Boolean);

                        const allCategories = new Set(allParsedThemes.flatMap(t => t.tags));
                        const sortedCategories = ['⭐ 收藏夹', ...Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'))];

                        sortedCategories.forEach(category => {
                            const themesInCategory = (category === '⭐ 收藏夹') ? allParsedThemes.filter(t => favorites.includes(t.value)) : allParsedThemes.filter(t => t.tags.includes(category));
                            if (themesInCategory.length === 0 && category !== '未分类' && category !== '⭐ 收藏夹') return;

                            const categoryDiv = document.createElement('div');
                            categoryDiv.className = 'theme-category';
                            categoryDiv.dataset.categoryName = category;
                            const title = document.createElement('div');
                            title.className = 'theme-category-title';
                            title.innerHTML = `<span>${category}</span>`;
                            
                            const list = document.createElement('ul');
                            list.className = 'theme-list';
                            list.style.display = 'block';

                            themesInCategory.forEach(theme => {
                                const item = document.createElement('li');
                                item.className = 'theme-item';
                                item.dataset.value = theme.value;
                                const isFavorited = favorites.includes(theme.value);
                                const starCharacter = isFavorited ? '★' : '☆';
                                const isBound = !!themeBackgroundBindings[theme.value];
                                item.innerHTML = `
                                    <span class="theme-item-name">${theme.display}</span>
                                    <div class="theme-item-buttons">
                                        <button class="bind-bg-btn ${isBound ? 'bound' : ''}" title="绑定背景">🔗</button>
                                        <button class="unbind-bg-btn" style="display: ${isBound ? 'inline-block' : 'none'}" title="解绑背景">🚫</button>
                                        <button class="favorite-btn" title="收藏">${starCharacter}</button>
                                        <button class="rename-btn" title="重命名">✏️</button>
                                        <button class="delete-btn" title="删除">🗑️</button>
                                    </div>`;
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

                async function performBatchRename(renameLogic) {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    showLoader();
                    const currentThemes = await getAllThemesFromAPI();
                    for (const oldName of selectedForBatch) {
                        const themeObject = currentThemes.find(t => t.name === oldName);
                        if (!themeObject) continue;
                        const newName = renameLogic(oldName);
                        if (currentThemes.some(t => t.name === newName && t.name !== oldName)) continue;
                        if (newName !== oldName) {
                            await saveTheme({ ...themeObject, name: newName });
                            await deleteTheme(oldName);
                            manualUpdateOriginalSelect('rename', oldName, newName);
                        }
                    }
                    hideLoader();
                    selectedForBatch.clear();
                }

                async function performBatchDelete() {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    if (!confirm(`确定要删除选中的 ${selectedForBatch.size} 个主题吗？`)) return;
                    showLoader();
                    for (const themeName of selectedForBatch) {
                        const isCurrentlyActive = originalSelect.value === themeName;
                        await deleteTheme(themeName);
                        manualUpdateOriginalSelect('delete', themeName);
                        if (isCurrentlyActive) {
                            const azureOption = originalSelect.querySelector('option[value="Azure"]');
                            originalSelect.value = azureOption ? 'Azure' : (originalSelect.options[0]?.value || '');
                            originalSelect.dispatchEvent(new Event('change'));
                        }
                    }
                    hideLoader();
                    selectedForBatch.clear();
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

                fileInput.addEventListener('change', async (event) => {
                    const files = event.target.files;
                    if (!files.length) return;
                    showLoader();
                    for (const file of files) {
                        try {
                            const fileContent = await file.text();
                            const themeObject = JSON.parse(fileContent);
                            if (themeObject && themeObject.name && typeof themeObject.main_text_color !== 'undefined') {
                                await saveTheme(themeObject);
                            }
                        } catch (err) {}
                    }
                    hideLoader();
                    setTimeout(() => location.reload(), 500);
                    event.target.value = ''; 
                });

                batchImportBtn.addEventListener('click', () => fileInput.click());

                document.querySelector('#batch-add-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    const newTag = prompt('请输入要添加的新标签（文件夹名）：');
                    if (newTag && newTag.trim()) {
                        await performBatchRename(oldName => `[${newTag.trim()}] ${oldName}`);
                        setTimeout(() => location.reload(), 500); // 【核心修复】
                    }
                });
                
                document.querySelector('#batch-move-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    const targetTag = prompt('请输入要移动到的目标分类（文件夹名）：');
                    if (targetTag && targetTag.trim()) {
                        const sanitizedTag = targetTag.trim().replace(/[\\/:*?"<>|]/g, '');
                        if (sanitizedTag !== targetTag.trim()) {
                            toastr.warning(`分类名包含非法字符，已自动过滤为: "${sanitizedTag}"`);
                        }
                        if (!sanitizedTag) { toastr.error('过滤后的分类名为空，操作已取消。'); return; }
                        await performBatchRename(oldName => `[${sanitizedTag}] ${oldName.replace(/\[.*?\]/g, '').trim()}`);
                        setTimeout(() => location.reload(), 500); // 【核心修复】
                    }
                });

                document.querySelector('#batch-delete-tag-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    const tagToRemove = prompt('请输入要移除的标签：');
                    if (tagToRemove && tagToRemove.trim()) {
                        await performBatchRename(oldName => oldName.replace(`[${tagToRemove.trim()}]`, '').trim());
                        setTimeout(() => location.reload(), 500); // 【核心修复】
                    }
                });

                document.querySelector('#batch-delete-btn').addEventListener('click', async () => {
                    await performBatchDelete();
                    setTimeout(() => location.reload(), 500); // 【核心修复】
                });

                contentWrapper.addEventListener('click', async (event) => {
                    const target = event.target;
                    const button = target.closest('button');
                    const themeItem = target.closest('.theme-item');
                    const categoryTitle = target.closest('.theme-category-title');

                    if (categoryTitle) {
                        const list = categoryTitle.nextElementSibling;
                        if (list) list.style.display = (list.style.display === 'none') ? 'block' : 'none';
                        return;
                    }

                    if (!themeItem) return;
                    const themeName = themeItem.dataset.value;

                    if (isBatchEditMode) {
                        themeItem.classList.toggle('selected-for-batch');
                        if (selectedForBatch.has(themeName)) {
                            selectedForBatch.delete(themeName);
                        } else {
                            selectedForBatch.add(themeName);
                        }
                    } else {
                        if (button && button.classList.contains('favorite-btn')) {
                            if (favorites.includes(themeName)) {
                                favorites = favorites.filter(f => f !== themeName);
                            } else {
                                favorites.push(themeName);
                            }
                            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                            await buildThemeUI();
                        }
                        else if (button && button.classList.contains('bind-bg-btn')) {
                            isBindingMode = true;
                            themeNameToBind = themeName;
                            document.querySelector('#logo_block .drawer-toggle').click();
                            toastr.info('请在背景面板中选择一张图片进行绑定。', '进入背景绑定模式');
                        }
                        else if (button && button.classList.contains('unbind-bg-btn')) {
                            delete themeBackgroundBindings[themeName];
                            localStorage.setItem(THEME_BACKGROUND_BINDINGS_KEY, JSON.stringify(themeBackgroundBindings));
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
                                if(themeBackgroundBindings[oldName]) {
                                    themeBackgroundBindings[newName] = themeBackgroundBindings[oldName];
                                    delete themeBackgroundBindings[oldName];
                                    localStorage.setItem(THEME_BACKGROUND_BINDINGS_KEY, JSON.stringify(themeBackgroundBindings));
                                }
                                manualUpdateOriginalSelect('rename', oldName, newName);
                                await buildThemeUI();
                            }
                        }
                        else if (button && button.classList.contains('delete-btn')) {
                            if (confirm(`确定要删除主题 "${themeItem.querySelector('.theme-item-name').textContent}" 吗？`)) {
                                const isCurrentlyActive = originalSelect.value === themeName;
                                await deleteTheme(themeName);
                                delete themeBackgroundBindings[themeName];
                                localStorage.setItem(THEME_BACKGROUND_BINDINGS_KEY, JSON.stringify(themeBackgroundBindings));
                                manualUpdateOriginalSelect('delete', themeName);
                                if (isCurrentlyActive) {
                                    const azureOption = originalSelect.querySelector('option[value="Azure"]');
                                    originalSelect.value = azureOption ? 'Azure' : (originalSelect.options[0]?.value || '');
                                    originalSelect.dispatchEvent(new Event('change'));
                                }
                                await buildThemeUI();
                            }
                        } else {
                            originalSelect.value = themeName;
                            originalSelect.dispatchEvent(new Event('change'));
                        }
                    }
                });

                originalSelect.addEventListener('change', (event) => {
                    updateActiveState();
                    const newThemeName = event.target.value;
                    const boundBg = themeBackgroundBindings[newThemeName];
                    if (boundBg) {
                        const bgElement = document.querySelector(`#bg_menu_content .bg_example[bgfile="${boundBg}"]`);
                        if (bgElement) bgElement.click();
                    }
                });
                
                const observer = new MutationObserver(() => buildThemeUI());
                observer.observe(originalSelect, { childList: true });
                
                const bgMenuContent = document.querySelector('#bg_menu_content');
                if (bgMenuContent) {
                    bgMenuContent.addEventListener('click', async (e) => {
                        if (!isBindingMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const bgElement = e.target.closest('.bg_example');
                        if (!bgElement) return;
                        const bgFileName = bgElement.getAttribute('bgfile');
                        themeBackgroundBindings[themeNameToBind] = bgFileName;
                        localStorage.setItem(THEME_BACKGROUND_BINDINGS_KEY, JSON.stringify(themeBackgroundBindings));
                        toastr.success(`背景已成功绑定到主题！`);
                        isBindingMode = false;
                        themeNameToBind = null;
                        document.querySelector('#logo_block .drawer-toggle').click();
                        await buildThemeUI();
                    }, true);
                }

                buildThemeUI().then(() => {
                    const isInitiallyCollapsed = localStorage.getItem(COLLAPSE_KEY) !== 'false';
                    setCollapsed(isInitiallyCollapsed, false);
                });

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
            }
        }
    }, 250);
})();
