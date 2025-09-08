(function () {
    'use strict';

    // 设置一个定时器，持续检查目标元素是否存在
    const initInterval = setInterval(() => {
        // 我们要找的目标是原始的主题下拉选择框
        const originalSelect = document.querySelector('#theme_select');

        // 如果找到了这个选择框，并且我们的插件还没有被初始化过
        if (originalSelect && !document.querySelector('#theme-manager-panel')) {
            console.log("Theme Manager: 找到了目标元素, 开始初始化...");

            // 找到了就立刻停止定时器，避免重复执行
            clearInterval(initInterval);

            try {
                // 获取选择框的父容器
                const originalContainer = originalSelect.parentElement;
                if (!originalContainer) return;

                // 1. 隐藏原始的选择框容器
                originalContainer.style.display = 'none';

                // 2. 创建我们的新管理面板
                const managerPanel = document.createElement('div');
                managerPanel.id = 'theme-manager-panel';
                managerPanel.innerHTML = '<h4>🎨 主题管理器</h4>';

                // 3. 将我们的面板插入到原始容器的后面
                originalContainer.parentNode.insertBefore(managerPanel, originalContainer.nextSibling);

                // 4. 解析主题并生成新的UI
                function buildThemeUI() {
                    const oldContent = managerPanel.querySelector('.theme-content');
                    if (oldContent) oldContent.remove();

                    const contentWrapper = document.createElement('div');
                    contentWrapper.className = 'theme-content';

                    const themes = {};
                    Array.from(originalSelect.options).forEach(option => {
                        const themeName = option.value;
                        if (!themeName) return; // 跳过空的选项

                        let category = '未分类';
                        let displayName = themeName;
                        
                        // 命名规则解析，支持多种分隔符
                        const separators = ['-', '】', ']', ' ', '_'];
                        for (const sep of separators) {
                            const splitIndex = themeName.indexOf(sep);
                            if (splitIndex > 0) {
                                category = themeName.substring(0, splitIndex).trim();
                                displayName = themeName.substring(splitIndex + 1).trim();
                                break; 
                            }
                        }

                        if (!themes[category]) themes[category] = [];
                        themes[category].push({ value: themeName, display: displayName });
                    });

                    const sortedCategories = Object.keys(themes).sort((a, b) => a.localeCompare(b, 'zh-CN'));

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
                            list.style.display = (list.style.display === 'none') ? 'block' : 'none';
                        });

                        themes[category].forEach(theme => {
                            const item = document.createElement('li');
                            item.className = 'theme-item';
                            item.textContent = theme.display;
                            item.dataset.value = theme.value;

                            item.addEventListener('click', () => {
                                originalSelect.value = theme.value;
                                originalSelect.dispatchEvent(new Event('change'));
                            });
                            list.appendChild(item);
                        });

                        categoryDiv.appendChild(title);
                        categoryDiv.appendChild(list);
                        contentWrapper.appendChild(categoryDiv);
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

                // 监听原始选择框的变化，以同步我们的UI
                originalSelect.addEventListener('change', updateActiveState);

                // 初始构建UI
                buildThemeUI();

                console.log("Theme Manager: 插件初始化成功！");

            } catch (error) {
                console.error("Theme Manager: 初始化过程中发生错误:", error);
                // 如果出错，最好把原始的UI显示回来
                if(originalSelect) originalSelect.parentElement.style.display = '';
            }
        }
    }, 250); // 每250毫秒检查一次

})();
