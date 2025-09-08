(function () {
    'must use'; // 修正笔误，应为 'use strict'

    const initInterval = setInterval(() => {
        const originalSelect = document.querySelector('#themes');

        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager v2.0: 找到了目标元素，开始初始化多标签模式...");
            clearInterval(initInterval);

            try {
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;
                originalSelect.style.display = 'none';

                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = '<h4><span style="font-size: 20px;">🎨</span> 主题管理器 (多标签)</h4>';
                originalContainer.prepend(managerPanel);

                function buildThemeUI() {
                    const oldContent = managerPanel.querySelector('.theme-content');
                    if (oldContent) oldContent.remove();

                    const contentWrapper = document.createElement('div');
                    contentWrapper.className = 'theme-content';

                    const allThemes = [];
                    const allCategories = new Set(); // 使用Set确保分类不重复

                    // 第一步：解析所有主题和它们的标签
                    Array.from(originalSelect.options).forEach(option => {
                        const themeName = option.value;
                        if (!themeName) return;

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
                        
                        // 从显示名称中移除标签部分
                        displayName = themeName.replace(tagRegex, '').trim();

                        if (categories.length === 0) {
                            categories.push('未分类');
                            allCategories.add('未分类');
                        }
                        
                        allThemes.push({ value: themeName, display: displayName, categories: categories });
                    });

                    // 第二步：根据分类构建UI
                    const sortedCategories = Array.from(allCategories).sort((a, b) => a.localeCompare(b, 'zh-CN'));

                    sortedCategories.forEach(category => {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.className = 'theme-category';
                        const title = document.createElement('div');
                        title.className = 'theme-category-title';
                        title.textContent = category;
                        const list = document.createElement('ul');
                        list.className = 'theme-list';
                        list.style.display = 'none';

                        title.addEventListener('click', () => {
                            const isHidden = list.style.display === 'none';
                            list.style.display = isHidden ? 'block' : 'none';
                            title.style.fontWeight = isHidden ? 'bold' : 'normal';
                        });

                        // 筛选出属于当前分类的主题
                        allThemes.filter(theme => theme.categories.includes(category)).forEach(theme => {
                            const item = document.createElement('li');
                            item.className = 'theme-item';
                            item.textContent = theme.display;
                            item.dataset.value = theme.value;

                            item.addEventListener('click', (e) => {
                                e.stopPropagation(); 
                                originalSelect.value = theme.value;
                                originalSelect.dispatchEvent(new Event('change'));
                            });
                            list.appendChild(item);
                        });

                        // 只有当分类下有主题时才显示
                        if (list.children.length > 0) {
                            categoryDiv.appendChild(title);
                            categoryDiv.appendChild(list);
                            contentWrapper.appendChild(categoryDiv);
                        }
                    });

                    managerPanel.appendChild(contentWrapper);
                    updateActiveState();
                }

                function updateActiveState() {
                    const currentValue = originalSelect.value;
                    managerPanel.querySelectorAll('.theme-item').forEach(item => {
                        item.classList.toggle('active', item.dataset.value === currentValue);
                    });
                }
                
                originalSelect.addEventListener('change', updateActiveState);
                buildThemeUI();
                console.log("Theme Manager v2.0: 插件初始化成功！");

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
                if(originalSelect) originalSelect.parentElement.style.display = '';
            }
        }
    }, 250);

})();
