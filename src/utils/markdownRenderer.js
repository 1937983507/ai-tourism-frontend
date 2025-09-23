import { marked } from 'marked'
import DOMPurify from 'dompurify'

// import {sendMessage, sendMessage1} from "@/api/ai";
import { Marked } from 'marked'
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import "highlight.js/styles/paraiso-light.css";


export function markMessage(message) {
  message=message.replaceAll('\\n','\n')
  console.log('调用前'+message)
  const marked = new Marked(
    markedHighlight({
      pedantic: false,
      gfm: true, // 开启gfm
      breaks: true,
      smartLists: true,
      xhtml: true,
      async: false, // 如果是异步的，可以设置为 true
      langPrefix: 'hljs language-', // 可选：用于给代码块添加前缀
      emptyLangClass: 'no-lang', // 没有指定语言的代码块会添加这个类名
      highlight: (code) => {
              return hljs.highlightAuto(code).value
      }
    })
  )
  let markedMessage = marked.parse(message)
  console.log('调用了'+markedMessage)
  return markedMessage
}



// 配置marked选项
marked.setOptions({
  breaks: true, // 将换行符转换为<br>
  gfm: true,    // 启用GitHub风格的Markdown
  tables: true, // 启用表格支持
})

// 自定义渲染器美化样式
const renderer = new marked.Renderer()

// 美化标题
renderer.heading = (text, level) => {
  const fontSize = ['1.5rem', '1.3rem', '1.1rem', '1rem', '0.9rem', '0.8rem'][level - 1]
  return `<h${level} style="margin: 1rem 0 0.5rem 0; font-size: ${fontSize}; font-weight: 600; color: #2c3e50;">${text}</h${level}>`
}

// 美化段落
renderer.paragraph = (text) => {
  return `<p style="margin: 0.8rem 0; line-height: 1.6; color: #34495e;">${text}</p>`
}

// 美化列表
renderer.list = (body, ordered) => {
  const type = ordered ? 'ol' : 'ul'
  const style = ordered ? 
    'list-style-type: decimal; padding-left: 2rem;' : 
    'list-style-type: disc; padding-left: 2rem;'
  return `<${type} style="${style} margin: 0.8rem 0;">${body}</${type}>`
}

renderer.listitem = (text) => {
  return `<li style="margin: 0.4rem 0; line-height: 1.5;">${text}</li>`
}

// 美化强调文本
renderer.strong = (text) => {
  return `<strong style="font-weight: 700; color: #e74c3c;">${text}</strong>`
}

renderer.em = (text) => {
  return `<em style="font-style: italic; color: #3498db;">${text}</em>`
}

// 美化代码
renderer.code = (code, language) => {
  const validLanguage = language && language.match(/^[a-zA-Z0-9]+$/) ? language : 'text'
  return `<pre style="background: #f8f9fa; border-left: 4px solid #3498db; padding: 1rem; margin: 1rem 0; border-radius: 4px; overflow-x: auto;"><code class="language-${validLanguage}" style="font-family: 'Courier New', monospace; font-size: 0.9rem;">${DOMPurify.sanitize(code)}</code></pre>`
}

renderer.codespan = (code) => {
  return `<code style="background: #f1f2f6; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 0.9em; color: #e74c3c;">${code}</code>`
}

// 美化块引用
renderer.blockquote = (quote) => {
  return `<blockquote style="border-left: 4px solid #3498db; background: #f8f9fa; margin: 1rem 0; padding: 1rem 1.5rem; border-radius: 0 4px 4px 0;">${quote}</blockquote>`
}

// 美化表格
renderer.table = (header, body) => {
  return `<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid #ddd;">
    <thead>${header}</thead>
    <tbody>${body}</tbody>
  </table>`
}

renderer.tablerow = (content) => {
  return `<tr>${content}</tr>`
}

renderer.tablecell = (content, flags) => {
  const tag = flags.header ? 'th' : 'td'
  const style = flags.header ? 
    'background: #3498db; color: white; font-weight: 600;' : 
    'background: #f8f9fa;'
  const align = flags.align ? `text-align: ${flags.align};` : ''
  return `<${tag} style="border: 1px solid #ddd; padding: 0.8rem; ${style} ${align}">${content}</${tag}>`
}

// 美化链接
renderer.link = (href, title, text) => {
  const titleAttr = title ? `title="${title}"` : ''
  return `<a href="${href}" ${titleAttr} style="color: #3498db; text-decoration: none; border-bottom: 1px solid #3498db;" target="_blank" rel="noopener noreferrer">${text}</a>`
}

// 美化图片
renderer.image = (href, title, text) => {
  const titleAttr = title ? `title="${title}"` : ''
  return `<div style="margin: 1rem 0; text-align: center;">
    <img src="${href}" alt="${text}" ${titleAttr} style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none'" />
    ${text ? `<div style="font-size: 0.8rem; color: #7f8c8d; margin-top: 0.5rem;">${text}</div>` : ''}
  </div>`
}

// 美化水平线
renderer.hr = () => {
  return `<hr style="border: none; border-top: 2px solid #ecf0f1; margin: 1.5rem 0;" />`
}

// 主渲染函数
export function renderMarkdown(content) {
  if (!content) return ''
  
  try {
    // 使用自定义渲染器
    const rawHtml = marked.parse(content, { renderer })
    // 净化HTML防止XSS攻击
    return DOMPurify.sanitize(rawHtml)
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    return DOMPurify.sanitize(content) // 出错时返回原始文本
  }
}

// 简化的Markdown解析（用于流式输出）
export function simpleMarkdownParser(content) {
  if (!content) return ''
  
  // 简单的Markdown转换（不依赖marked，用于流式输出）
  let html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #e74c3c;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #3498db;">$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: #f1f2f6; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: monospace;">$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/- (.*?)(?=\n|$)/g, '<li style="margin: 0.2rem 0;">$1</li>')
    .replace(/(<li.*?<\/li>)+/g, '<ul style="padding-left: 1.5rem; margin: 0.5rem 0;">$&</ul>')
  
  return DOMPurify.sanitize(html)
}