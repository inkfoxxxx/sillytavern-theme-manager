(function () {
    'use strict';

    // 等待SillyTavern加载完成
    document.addEventListener('DOMContentLoaded', () => {
        // 目标：找到并改造UI主题选择器
        const targetSection = document.querySelector('#user-settings > .background_theming');

        if (!targetSection) {
            console.log("Theme Manager: 找不到主题设置区域, 插件无法启动。");
            return;
        }

        // 1. 获取原始的下拉选择框和它的容器
        const originalSelect = document.querySelector('#theme_select');
        const originalContainer = originalSelect.parentElement;

        if (!originalSelect || !originalContainer) {
            console.log("Theme Manager: 找不到原始主题选择框, 插件无法启动。");
            return;
        }

        // 2. 隐藏原始的选择框，但保留它，因为SillyTavern的内部逻辑可能还需要它
        originalContainer.style.display = 'none';

        // 3. 创建我们的新管理面板
        const managerPanel = document.createElement('div');
        managerPanel.id = 'theme-manager-panel';
        managerPanel.innerHTML = '<h4>🎨 主题管理器</h4>';

        // 4. 将我们的面板插入到原始选择框的后面
        originalContainer.parentNode.insertBefore(managerPanel, originalContainer.nextSibling);

        // 5. 解析主题并生成新的UI
        function buildThemeUI() {
            // 清空旧内容
            const oldContent = managerPanel.querySelector('.theme-content');
            if (oldContent) {
                oldContent.remove();
            }

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'theme-content';

            const themes = {};
            // 从原始选择框中读取所有主题选项
            Array.from(originalSelect.options).forEach(option => {
                const themeName = option.value;
                let category = '未分类';
                let displayName = themeName;

                // 命名规则解析：用 "-" 或 "】" 或 " " 分隔
                const separators = ['-', '】', ' '];
                let splitIndex = -1;
                for (const sep of separators) {
                    splitIndex = themeName.indexOf(sep);
                    if (splitIndex > 0) break;
                }


                if (splitIndex > 0) {
                    category = themeName.substring(0, splitIndex).trim();
                    displayName = themeName.substring(splitIndex + 1).trim();
                }

                if (!themes[category]) {
                    themes[category] = [];
                }
                themes[category].push({ value: themeName, display: displayName });
            });

            // 按分类名称排序
            const sortedCategories = Object.keys(themes).sort();

            sortedCategories.forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'theme-category';

                const title = document.createElement('div');
                title.className = 'theme-category-title';
                title.textContent = category;
                
                const list = document.createElement('ul');
                list.className = 'theme-list';
                // 默认折叠
                list.style.display = 'none';

                // 点击标题展开/折叠
                title.addEventListener('click', () => {
                    list.style.display = list.style.display === 'none' ? 'block' : 'none';
                    title.textContent = list.style.display === 'none' ? category : category;
                });

                themes[category].forEach(theme => {
                    const item = document.createElement('li');
                    item.className = 'theme-item';
                    item.textContent = theme.display;
                    item.dataset.value = theme.value;

                    // 点击主题项，就去同步更新背后隐藏的那个原始选择框，从而触发SillyTavern的换肤功能
                    item.addEventListener('click', () => {
                        originalSelect.value = theme.value;
                        // 触发一个change事件，让SillyTavern知道我们改了选项
                        originalSelect.dispatchEvent(new Event('change'));
                        // 更新我们UI上的高亮状态
                        updateActiveState();
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
        
        // 更新哪个主题项是当前激活的
        function updateActiveState() {
            const currentValue = originalSelect.value;
            managerPanel.querySelectorAll('.theme-item').forEach(item => {
                if (item.dataset.value === currentValue) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        // 初始构建UI
        buildThemeUI();
        
        // SillyTavern可能会动态刷新主题列表，我们需要监听变化
        const observer = new MutationObserver(buildThemeUI);
        observer.observe(originalSelect, { childList: true });

        console.log("Theme Manager插件加载成功！");
    });
})();