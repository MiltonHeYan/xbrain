# README presentation and language selection

The root `README.md` is English. Explicit links select Chinese (`README.zh-CN.md`),
Japanese (`README.ja.md`) and Korean (`README.ko.md`). `README.en.md` retains the
same English content so existing links continue to work.

Each version starts with a one-line installation and bookmark-sync prompt that
points to the main branch's `SKILL.md`. GitHub provides the normal code-block copy
control. The Agent marks below are static images with accessible alt text and
light/dark variants; there are no Agent launch links, custom copy controls, or
redirect pages.

[GitHub's README documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
describes automatic README discovery by location: `.github`, root, then `docs`.
It does not document browser-language-based selection between translated README
files. We use the English root README and explicit language links accordingly.

[GitHub's markup pipeline](https://github.com/github/markup) removes scripts,
inline styles and other unsupported HTML. A README cannot run custom JavaScript
to select a translation or launch an app. This presentation needs neither.
