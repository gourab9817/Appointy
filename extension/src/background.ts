// Background service worker for Second Memory
import { supabase } from './lib/supabase';
import { extractTextFromImage, generatePDFSummary, generateSmartTags } from './lib/gemini';
import { extractTextFromPDFBlob, getPDFMetadata } from './lib/pdfUtils';

interface Memory {
  id: string;
  url: string;
  title: string;
  note: string;
  tags: string[];
  category: string;
  platform: string;
  timestamp: number;
  created_at: string;
  favicon?: string;
  selected_text?: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function detectPlatform(url: string): string {
  if (!url) return 'Website';
  
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Remove 'www.' prefix
    hostname = hostname.replace(/^www\./, '');
    
    // Special cases for well-known platforms (keep their brand names)
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'YouTube';
    if (hostname.includes('twitter.com') || hostname === 'x.com') return 'Twitter';
    if (hostname === 'github.com') return 'GitHub';
    if (hostname === 'stackoverflow.com') return 'Stack Overflow';
    if (hostname === 'medium.com') return 'Medium';
    if (hostname === 'dev.to') return 'Dev.to';
    if (hostname === 'reddit.com') return 'Reddit';
    if (hostname === 'linkedin.com') return 'LinkedIn';
    
    // For all other sites, capitalize the domain nicely
    // e.g., "wikipedia.org" -> "Wikipedia", "notion.so" -> "Notion"
    const domainParts = hostname.split('.');
    const mainDomain = domainParts[0];
    
    // Capitalize first letter
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch (e) {
    return 'Website';
  }
}

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for selected text
  chrome.contextMenus.create({
    id: 'save-selection',
    title: '💾 Save to Second Memory',
    contexts: ['selection']
  });

  // Context menu for links
  chrome.contextMenus.create({
    id: 'save-link',
    title: '💾 Save link to Second Memory',
    contexts: ['link']
  });

  // Context menu for pages
  chrome.contextMenus.create({
    id: 'save-page',
    title: '💾 Save page to Second Memory',
    contexts: ['page']
  });

  console.log('Second Memory: Context menus created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;

  let memory: Memory;

  if (info.menuItemId === 'save-selection') {
    // Save selected text
    memory = {
      id: generateId(),
      url: tab.url || '',
      title: tab.title || 'Selected Text',
      note: info.selectionText || '',
      tags: ['selection', 'quick-save'],
      category: 'Quick Save',
      platform: detectPlatform(tab.url || ''),
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
      favicon: tab.favIconUrl,
      selected_text: info.selectionText
    };
  } else if (info.menuItemId === 'save-link') {
    // Save link
    memory = {
      id: generateId(),
      url: info.linkUrl || '',
      title: info.linkUrl || 'Saved Link',
      note: `Saved from: ${tab.title}`,
      tags: ['link', 'quick-save'],
      category: 'Link',
      platform: detectPlatform(info.linkUrl || ''),
      timestamp: Date.now(),
      created_at: new Date().toISOString()
    };
  } else {
    // Save current page
    memory = {
      id: generateId(),
      url: tab.url || '',
      title: tab.title || 'Untitled',
      note: 'Quick saved from context menu',
      tags: ['quick-save'],
      category: 'Quick Save',
      platform: detectPlatform(tab.url || ''),
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
      favicon: tab.favIconUrl
    };
  }

  // Save to storage
  try {
    // Save to Supabase
    const { error: supabaseError } = await supabase
      .from('memories')
      .insert([memory]);
    
    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
    } else {
      console.log('✅ Saved to Supabase');
    }
    
    // Also save to local storage as backup
    const result = await chrome.storage.local.get(['memories']);
    const memories = result.memories || [];
    memories.unshift(memory);
    await chrome.storage.local.set({ memories });

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Second Memory',
      message: '✅ Saved successfully!',
      priority: 1
    });

    console.log('Memory saved:', memory);
  } catch (error) {
    console.error('Error saving memory:', error);
  }
});

// Handle keyboard shortcut for quick save
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-save') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const memory: Memory = {
      id: generateId(),
      url: tab.url || '',
      title: tab.title || 'Untitled',
      note: 'Quick saved with keyboard shortcut',
      tags: ['quick-save', 'keyboard'],
      category: 'Quick Save',
      platform: detectPlatform(tab.url || ''),
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
      favicon: tab.favIconUrl
    };

    try {
      const result = await chrome.storage.local.get(['memories']);
      const memories = result.memories || [];
      memories.unshift(memory);
      await chrome.storage.local.set({ memories });

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Second Memory',
        message: '⚡ Quick saved!',
        priority: 1
      });

      console.log('Quick save successful:', memory);
    } catch (error) {
      console.error('Error quick saving:', error);
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    handleScreenshotCapture(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'exportPDF') {
    handlePDFExport(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Handle screenshot capture and upload
 */
async function handleScreenshotCapture(data: { url: string; title: string; screenshot: string }): Promise<void> {
  try {
    console.log('📸 Starting screenshot upload and AI processing...');
    
    const screenshot = data.screenshot;
    
    // Convert base64 to blob
    const response = await fetch(screenshot);
    const blob = await response.blob();
    
    // Generate unique filename
    const id = generateId();
    const filename = `screenshot_${id}.png`;
    
    // Upload to Supabase Storage
    console.log('☁️ Uploading screenshot to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filename, blob, {
        contentType: 'image/png',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(filename);
    
    console.log('✅ Screenshot uploaded:', publicUrl);
    
    // Extract text using Gemini Vision
    console.log('🤖 Extracting text with Gemini AI...');
    const base64Data = screenshot.split(',')[1]; // Remove data:image/png;base64, prefix
    const extractedText = await extractTextFromImage(base64Data);
    
    // Generate smart tags
    const tags = await generateSmartTags(extractedText, 'screenshot');
    
    // Save screenshot metadata to database
    const screenshotRecord = {
      id,
      url: data.url,
      title: data.title,
      image_url: publicUrl,
      extracted_text: extractedText,
      tags,
      timestamp: Date.now(),
      created_at: new Date().toISOString()
    };
    
    const { error: dbError } = await supabase
      .from('screenshots')
      .insert([screenshotRecord]);
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    console.log('✅ Screenshot saved to database');
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Screenshot Saved!',
      message: `📸 Screenshot captured and text extracted successfully`,
      priority: 2
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  }
}

/**
 * Handle PDF export and upload
 */
async function handlePDFExport(data: { url: string; title: string; pdfBlob: Blob }): Promise<void> {
  try {
    console.log('📄 Starting PDF export...');
    
    // Get PDF metadata
    const metadata = getPDFMetadata(data.pdfBlob);
    
    // Extract text from PDF
    console.log('📝 Extracting text from PDF...');
    const { text: extractedText, pageCount } = await extractTextFromPDFBlob(data.pdfBlob);
    
    // Generate unique filename
    const id = generateId();
    const filename = `pdf_${id}.pdf`;
    
    // Upload to Supabase Storage
    console.log('☁️ Uploading PDF to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(filename, data.pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(filename);
    
    console.log('✅ PDF uploaded:', publicUrl);
    
    // Generate summary using Gemini AI
    console.log('🤖 Generating PDF summary with Gemini AI...');
    const summary = await generatePDFSummary(extractedText, data.title);
    
    // Generate smart tags
    const tags = await generateSmartTags(extractedText + ' ' + summary, 'pdf');
    
    // Save PDF metadata to database
    const pdfRecord = {
      id,
      url: data.url,
      title: data.title,
      pdf_url: publicUrl,
      summary,
      full_text: extractedText,
      tags,
      page_count: pageCount,
      file_size: metadata.size,
      timestamp: Date.now(),
      created_at: new Date().toISOString()
    };
    
    const { error: dbError } = await supabase
      .from('pdfs')
      .insert([pdfRecord]);
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    console.log('✅ PDF saved to database');
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'PDF Exported!',
      message: `📄 PDF uploaded and summarized successfully (${pageCount} pages)`,
      priority: 2
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}

export {};

