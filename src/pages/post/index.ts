import { initComments } from "./comment";
import { handlePasswordForm } from "./locked";
import { initCodeBlockAction, initPrism, initShiki } from "./code-block";

import "@/style/post.less";
import "virtual:components/post";

import "mdui/components/button-icon";
import "@mdui/icons/copy-all";

function initFancybox(container: HTMLElement) {
  return Promise.all([
    import("@fancyapps/ui/dist/fancybox/fancybox.css"),
    Promise.all([
      import("@fancyapps/ui"),
      import("@fancyapps/ui/l10n/Fancybox/zh_CN")
    ]).then(([{ Fancybox: fb }, { zh_CN }]) => {
      container.querySelectorAll<HTMLImageElement>("img").forEach(v => {
        v.setAttribute("data-fancybox", "article");
        if (v.alt ?? v.title) {
          v.setAttribute("data-caption", v.alt ?? v.title);
        }
      });
      fb.bind("[data-fancybox]", {
        l10n: zh_CN
      });
    })
  ]);
}

function initLikeButton() {
  const likeButton = document.getElementById('matecho-like-button');
  if (!likeButton) {
    return;
  }

  const likeCountSpan = document.getElementById('matecho-like-count');
  const cid = likeButton.dataset.cid;
  if (!cid) return;

  const likedPosts = JSON.parse(localStorage.getItem('matecho_liked_posts') || '[]');

  if (likedPosts.includes(cid)) {
    likeButton.classList.add('liked');
  }

  likeButton.addEventListener('click', () => {
    if (likeButton.classList.contains('liked') || likeButton.classList.contains('animating')) {
      return;
    }

    const currentLikedPosts = JSON.parse(localStorage.getItem('matecho_liked_posts') || '[]');
    if (currentLikedPosts.includes(cid)) {
        likeButton.classList.add('liked');
        return;
    }

    likeButton.classList.add('animating');

    const formData = new FormData();
    formData.append('cid', cid);

    fetch('/like.php', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          if(likeCountSpan) {
            likeCountSpan.textContent = data.likes;
          }
          likeButton.classList.add('liked');
          
          const updatedLikedPosts = [...currentLikedPosts, cid];
          localStorage.setItem('matecho_liked_posts', JSON.stringify(updatedLikedPosts));
        }
      })
      .catch(error => {
        console.error('Error liking post:', error);
      })
      .finally(() => {
        // Remove animation class after animation completes
        setTimeout(() => {
          likeButton.classList.remove('animating');
        }, 600); // Corresponds to animation duration in CSS
      });
  });
}

export function initKaTeX(container: HTMLElement) {
  return Promise.all([
    import("katex/dist/katex.css"),
    import("katex/contrib/auto-render").then(
      ({ default: renderMathInElement }) => {
        renderMathInElement(container, {
          delimiters: [
            { left: "$", right: "$", display: true },
            { left: "$", right: "$", display: false }
          ]
        });
      }
    )
  ]);
}

export async function initMermaid(container: HTMLElement) {
  const nodes = container.querySelectorAll<HTMLElement>(
    "pre > code.lang-mermaid"
  );
  const mapNodes = Array.from(nodes).map(node => {
    const parent = node.parentElement!;
    parent.classList.add("mermaid");
    parent.setAttribute("data-processed", "");
    parent.innerHTML = node.innerHTML || "";
    return parent;
  });
  const [{ default: mermaid }, { default: ZenUML }] = await Promise.all([
    import("mermaid"),
    import("@mermaid-js/mermaid-zenuml")
  ]);
  await mermaid.registerExternalDiagrams([ZenUML], {
    lazyLoad: true
  });
  mermaid.initialize({
    startOnLoad: false
  });
  return await mermaid.run({
    nodes: mapNodes
  });
}

function countMoney(str: string) {
  let count = -1;
  let index = -2;
  for (; index != -1; count++, index = str.indexOf("$", index + 1));
  return count;
}

export function init(el: HTMLElement) {
  initComments(el);
  initLikeButton();
  const article = el.querySelector<HTMLElement>("article.mdui-prose");
  const { Highlighter, FancyBox, KaTeX, Mermaid } = window.__MATECHO_OPTIONS__;
  if (article) {
    initCodeBlockAction(article);
    // enforce Mermaid processed before code block
    // this is required to prevent codeblock logic break Mermaid.
    // initMermaid will modify DOM struct make code block logic cannot process it as code block
    if (Mermaid && article.querySelector("pre > code.lang-mermaid")) {
      void initMermaid(article);
    }
    if (article.querySelector("pre > code[class*=lang-]")) {
      if (Highlighter == "Prism") {
        void initPrism(article);
      } else if (Highlighter == "Shiki") {
        void initShiki(article);
      }
    }
    if (FancyBox && article.querySelector("img")) {
      void initFancybox(article);
    }
    if (KaTeX) {
      const count$ = countMoney(article.innerText);
      if (article.innerText.includes("$")) {
        const excludeText = Array.from(
          article.querySelectorAll<HTMLElement>(
            "script, noscript, style, textarea, pre, code, option"
          )
        )
          .map(v => v.innerText)
          .join("");
        const excluded$ = countMoney(excludeText);
        if (excluded$ < count$) {
          void initKaTeX(article);
        }
      }
    }
  }
  const password = document.querySelector<HTMLFormElement>(
    "form#matecho-password-form"
  );
  if (password) {
    handlePasswordForm(password);
  }
}

export { initPrism, initShiki };
