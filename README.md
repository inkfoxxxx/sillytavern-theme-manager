# 酒馆美化管理助手
- 主要是为了我自己管理美化方便，bug一堆无力肘击，问我也不一定能解决，可以自己下载文件去问AI。
- 每次更新后需要手动刷新！90%的问题都可以靠刷新解决！
- 就在酒馆原生的换美化的位置，把拓展的勾选勾掉就会变回原生的样子，更方便。

  <img width="480" height="790" alt="image" src="https://github.com/user-attachments/assets/91252158-d155-4b7c-93ca-a7b0b814dc4b" />
## 功能简介：
- 文件夹
  - 自分类：凡是符合“[标签]美化名称”“美化名称[标签]”格式的美化，都可以自动创建和标签名一样的文件夹，自动收纳（[标签]在哪里都行，插在美化名称中间也可以）。
  - 标签：标签可以添加多个，会被同时收纳进不同文件夹。
 
    <img width="477" height="648" alt="image" src="https://github.com/user-attachments/assets/162c1fdf-7dfa-43b7-8c10-da4fd414d4e8" />
  - 点击文件夹右侧的“解散”可一键去除该文件夹内美化的标签（只去除和该文件夹同名的标签），即解散文件夹，不影响美化文件本身。
  - 点击文件夹右侧小铅笔可以给文件夹重命名。

    <img width="480" height="72" alt="image" src="https://github.com/user-attachments/assets/1bc275c4-14da-4e66-b306-213d0a5fdcfc" />
  - 文件夹排序
    
    <img width="483" height="652" alt="image" src="https://github.com/user-attachments/assets/195cbbf4-7750-45ac-b908-68ea8ac92be7" />
- 批量导入
  - 点击“批量导入”按钮，可多选json格式的美化文件同时导入，导入后页面自动刷新。
  - 精力有限没有做更多细节，不要导入同名文件，虽然可以导入成功，但用的时候好像会出问题（而且删除的时候好像会把同名文件一起删除？）。
  - 有一个一直没肘赢的bug：用插件删除某美化后，再用原生的导入按钮导入刚刚删掉的美化，会报错“同名文件已存在”。我是笨蛋我肘失败了，如果想重新导入的话，①刷新后再导，用插件或原生的都行；②不用刷新，直接用插件导入。
- 批量编辑
  - 点击“批量编辑”按钮进入编辑模式，此模式下点击美化名字不会更换美化，可以多选，然后进行下一步操作。
  - 一共有五个批量编辑功能，点击后会弹出提示框，根据提示框来操作即可：
      
    <img width="492" height="900" alt="image" src="https://github.com/user-attachments/assets/8e706f3b-749f-44f4-bc29-fb71b1c481c0" />
  - 编辑后记得退出编辑模式！
- 背景图管理
  - 点击“管理背景”进入背景图批量管理模式。注意！使用该功能前请先点开原生的背景图页面从头至尾滑动一遍，让缩略图加载出来。

    <img width="1103" height="805" alt="image" src="https://github.com/user-attachments/assets/cf80fea6-440c-44e4-9164-f4a7b36024ce" />
- 配置导入/导出
  - 将你已整理/绑定/设置好的数据导出，如果你更换了浏览器/设备，可以通过导入json文件来同步配置，无需重新整理。

    <img width="1495" height="544" alt="image" src="https://github.com/user-attachments/assets/47287d69-da1d-4fb5-bf06-2a5face65bf2" />
- 角色卡绑定美化
  - 如图所示：
    
    <img width="652" height="435" alt="image" src="https://github.com/user-attachments/assets/fb2e7cbd-8f78-42ce-ada6-7235780381bf" />
    <img width="1110" height="726" alt="image" src="https://github.com/user-attachments/assets/22706421-0d4d-4d25-a306-d51f30825657" />
  - 一个美化可以被多个角色卡绑定。
- 单独功能
  - 点击美化名右边的星星符号即可收藏，被收藏的美化会自动移入最上方的收藏夹，再次点击星星可取消收藏。
  - 点击右侧铅笔图标可重命名（别和别的文件名字一样，可能会有不报错的bug，我没写报错功能）。
  - 点击右侧垃圾桶图标可删除该美化文件。

    <img width="478" height="435" alt="image" src="https://github.com/user-attachments/assets/1c4cf20b-66e5-4cd5-8207-d2b370b0c8d1" />
- 搜索
  - 美化太多了找不到想要的？点击上方搜索栏，支持模糊搜索，只要你能记得你想要找的美化名任何一个字就行。
  - 搜索完记得删掉搜索框的文字捏，不然文件夹内只显示对应美化了。

    <img width="488" height="1065" alt="image" src="https://github.com/user-attachments/assets/7cac77e2-0859-4d40-8125-02614020aa0c" />
- 随机
  - 掷骰子吧，随机换装一个已导入的美化~
- 折叠收纳
  - 文件夹和插件本身都可以折叠起来，优化视觉体验。也可以一键全部展开/折叠。
    
    <img width="477" height="243" alt="image" src="https://github.com/user-attachments/assets/996498bc-7604-485a-9f77-7267c0b90b68" />
- 半兼容原生功能
  - 保留了原生的导入、导出、保存和另存功能，基本是没有冲突的，如果报错就手动刷新酒馆再试，刷新可以解决绝大部分问题。
- 自适应主题色
  - 会自己换衣服，很省心的插件宝宝一枚（什）。
  - 当前正在应用的美化会被圈出来，多选时被选中的美化也会有颜色区分。
- 刷新提醒
  - 实在没肘赢热刷新，所以请操作完后手动刷新页面，不然你本轮操作过的文件点击是没反应的（“收藏”和“调整顺序”操作除外）。操作完会有刷新提示：
    
    <img width="483" height="241" alt="image" src="https://github.com/user-attachments/assets/bbaac704-a7a7-4ace-b32c-0782e3d9b0fa" />

    
