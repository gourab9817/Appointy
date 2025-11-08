// Test data for development - Run this in console to add sample memories
const sampleMemories = [
  {
    id: 'sample1',
    url: 'https://react.dev',
    title: 'React - The library for web and native user interfaces',
    note: 'Official React documentation - great resource for learning hooks',
    tags: ['react', 'documentation', 'frontend'],
    category: 'Documentation',
    platform: 'Article',
    timestamp: Date.now() - 3600000, // 1 hour ago
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    favicon: 'https://react.dev/favicon.ico'
  },
  {
    id: 'sample2',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Amazing React Tutorial',
    note: 'This video explains React hooks in detail. Must watch!',
    tags: ['react', 'tutorial', 'video', 'hooks'],
    category: 'Video',
    platform: 'YouTube',
    timestamp: Date.now() - 7200000, // 2 hours ago
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'sample3',
    url: 'https://github.com/facebook/react',
    title: 'facebook/react: The library for web and native user interfaces',
    note: 'React source code - interesting to see how it works internally',
    tags: ['react', 'open-source', 'github'],
    category: 'Research',
    platform: 'GitHub',
    timestamp: Date.now() - 86400000, // 1 day ago
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'sample4',
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS - Rapidly build modern websites',
    note: 'Best CSS framework for rapid prototyping',
    tags: ['css', 'tailwind', 'design', 'frontend'],
    category: 'Tool',
    platform: 'Article',
    timestamp: Date.now() - 172800000, // 2 days ago
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'sample5',
    url: 'https://vitejs.dev',
    title: 'Vite - Next Generation Frontend Tooling',
    note: 'Super fast build tool for modern web projects',
    tags: ['vite', 'build-tool', 'frontend'],
    category: 'Tool',
    platform: 'Article',
    timestamp: Date.now() - 259200000, // 3 days ago
    createdAt: new Date(Date.now() - 259200000).toISOString()
  }
];

// Add to localStorage
localStorage.setItem('memories', JSON.stringify(sampleMemories));
console.log('✅ Sample memories added! Refresh the page to see them.');

