(function () {
    'use strict';

    const { getRequestHeaders } = SillyTavern.getContext();
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
            if (optionToRename) {
                optionToRename.value = newName;
                optionToRename.textContent = newName;
            }
        }
    }

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && window.SillyTavern?.getContext && !document.querySelector('#theme-manager-panel')) {
            clearInterval(initInterval);

            try {
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.position = 'absolute'; originalSelect.style.opacity = '0'; originalSelect.style.pointerEvents = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = `
                    <h4><span>🎨 主题仪表盘</span></h4>
                    <div class="theme-manager-actions">
                        <input type="search" id="theme-search-box" placeholder="🔍 搜索主题...">
                        <button id="random-theme-btn" title="随机">🎲 随机</button>
                        <button id="batch-edit-btn" title="批量编辑">🔧 批量编辑</button>
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
                    contentWrapper.innerHTML = '';
                    allThemeObjects = await getAllThemesFromAPI();
                    const allThemes = Array.from(originalSelect.options).map(option => {
                        const themeName = option.value;
                        if (!themeName) return null;
                        let displayName = themeName;
                        const tags = [];
                        const tagRegex = /\[(.*?)\]/g;
                        let match;
                        while ((match = tagRegex.exec(themeName)) !== null) {
                            if (match.trim()) tags.push(match.trim());
                        }
                        displayName = themeName.replace(/\[.*?\]/g, '').trim();
                        if (tags.length === 0) tags.push('未分类');
                        return { value: themeName, display: displayName, tags: tags };
                    }).filter(Boolean);

                    const allCategories = new Set(allThemes.flatMap(t => t.tags));
                    const sortedCategories = ['⭐ 收藏夹', ...Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'))];

                    sortedCategories.forEach(category => {
                        const themesInCategory = (category === '⭐ 收藏夹') ? allThemes.filter(t => favorites.includes(t.value)) : allThemes.filter(t => t.tags.includes(category));
                        if (themesInCategory.length === 0 && !['未分类', '⭐ 收藏夹'].includes(category)) return;

                        const categoryDiv = document.createElement('div');
                        categoryDiv.className = 'theme-category';
                        categoryDiv.dataset.categoryName = category;
                        const title = document.createElement('div');
                        title.className = 'theme-category-title';
                        title.innerHTML = `<span>${category}</span>`;
                        if (!['未分类', '⭐ 收藏夹'].includes(category)) {
                            title.innerHTML += `<button class="dissolve-folder-btn" title="解散此文件夹">解散</button>`;
                        }
                        const list = document.createElement('ul');
                        list.className = 'theme-list';
                        list.style.display = 'block';

                        themesInCategory.forEach(theme => {
                            const item = document.createElement('li');
                            item.className = 'theme-item';
                            item.dataset.value = theme.value;
                            if (selectedForBatch.has(theme.value)) item.classList.add('selected-for-batch');
                            item.innerHTML = `
                                <input type="checkbox" class="theme-item-checkbox" ${selectedForBatch.has(theme.value) ? 'checked' : ''}>
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
                }

                searchBox.addEventListener('input', () => { /* ... */ });
                randomBtn.addEventListener('click', async () => { /* ... */ });
                batchEditBtn.addEventListener('click', () => { /* ... */ });

                async function performBatchRename(renameLogic) {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return false; }
                    showLoader();
                    for (const oldName of Array.from(selectedForBatch)) {
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

                document.querySelector('#batch-add-tag-btn').addEventListener('click', async () => {
                    const newTag = prompt('请输入要添加的新标签：');
                    if (!newTag?.trim()) return;
                    if (await performBatchRename(oldName => `[${newTag.trim()}] ${oldName}`)) toastr.success('批量添加标签完成！');
                });

                document.querySelector('#batch-move-tag-btn').addEventListener('click', async () => {
                    const targetTag = prompt('请输入目标分类：');
                    if (!targetTag?.trim()) return;
                    if (await performBatchRename(oldName => `[${targetTag.trim()}] ${oldName.replace(/\[.*?\]/g, '').trim()}`)) toastr.success('批量移动完成！');
                });

                document.querySelector('#batch-delete-tag-btn').addEventListener('click', async () => {
                    const tagToRemove = prompt('请输入要移除的标签：');
                    if (!tagToRemove?.trim()) return;
                    if (await performBatchRename(oldName => oldName.replace(`[${tagToRemove.trim()}]`, '').trim())) toastr.success('批量移除标签完成！');
                });

                document.querySelector('#batch-delete-btn').addEventListener('click', async () => {
                    if (selectedForBatch.size === 0) { toastr.info('请先选择至少一个主题。'); return; }
                    if (!confirm(`确定要删除选中的 ${selectedForBatch.size} 个主题吗？`)) return;
                    showLoader();
                    for (const themeName of Array.from(selectedForBatch)) {
                        await deleteTheme(themeName);
                        manualUpdateOriginalSelect('delete', themeName);
                    }
                    selectedForBatch.clear();
                    hideLoader();
                    toastr.success('批量删除完成！');
                });

                contentWrapper.addEventListener('click', async (event) => { /* ... */ });
                contentWrapper.addEventListener('change', (event) => { /* ... */ });

                const observer = new MutationObserver(() => buildThemeUI());
                observer.observe(originalSelect, { childList: true, subtree: true, characterData: true });

                buildThemeUI();

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
            }
        }
    }, 250);
})();
