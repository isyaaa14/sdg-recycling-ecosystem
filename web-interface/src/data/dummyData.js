export const userStats = {
  totalPoints: 2450,
  totalKg: 38.5,
  totalDeposits: 24,
};

export const contributionHistory = [
  { id: 1, date: '2026-06-28', category: 'Plastic Bottles', kg: 2.5, points: 125 },
  { id: 2, date: '2026-06-25', category: 'Paper & Cardboard', kg: 4.0, points: 80 },
  { id: 3, date: '2026-06-20', category: 'Aluminium Cans', kg: 1.2, points: 96 },
  { id: 4, date: '2026-06-15', category: 'E-Waste', kg: 3.8, points: 190 },
  { id: 5, date: '2026-06-10', category: 'Glass', kg: 2.0, points: 100 },
  { id: 6, date: '2026-06-05', category: 'Plastic Bottles', kg: 1.5, points: 75 },
];

export const leaderboardData = [
  { rank: 1, name: 'Priya Sharma', points: 5200, kg: 82.3 },
  { rank: 2, name: 'Wei Ming Lee', points: 4800, kg: 76.1 },
  { rank: 3, name: 'Aaron Tan Wen Zhuan', points: 2450, kg: 38.5, isCurrentUser: true },
  { rank: 4, name: 'Nurul Aisyah', points: 2100, kg: 33.2 },
  { rank: 5, name: 'Raj Patel', points: 1980, kg: 31.0 },
  { rank: 6, name: 'Siti Aminah', points: 1750, kg: 27.8 },
  { rank: 7, name: 'John Doe', points: 1620, kg: 25.4 },
  { rank: 8, name: 'Lisa Wong', points: 1500, kg: 23.6 },
];

export const rewardsCatalogue = [
  {
    id: 1,
    name: 'UOW Malaysia T-Shirt',
    pointsRequired: 500,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=480&q=80&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'Reusable Water Bottle',
    pointsRequired: 300,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=480&q=80&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Campus Cafeteria Voucher (RM10)',
    pointsRequired: 200,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=480&q=80&auto=format&fit=crop',
  },
  {
    id: 4,
    name: 'Eco Tote Bag',
    pointsRequired: 150,
    image: 'https://images.unsplash.com/photo-1591195853828-11a059285016?w=480&q=80&auto=format&fit=crop',
  },
  {
    id: 5,
    name: 'Bookstore Discount (15%)',
    pointsRequired: 400,
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=480&q=80&auto=format&fit=crop',
  },
  {
    id: 6,
    name: 'Parking Pass (1 Week)',
    pointsRequired: 800,
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e127f00?w=480&q=80&auto=format&fit=crop',
  },
];

export const badges = [
  { id: 1, name: 'First Deposit', description: 'Made your first recycling deposit', earned: true, icon: 'leaf' },
  { id: 2, name: 'Plastic Pioneer', description: 'Recycled 10kg of plastic', earned: true, icon: 'recycle' },
  { id: 3, name: 'Paper Champion', description: 'Recycled 15kg of paper', earned: true, icon: 'paper' },
  { id: 4, name: 'Eco Warrior', description: 'Earned 2,000 points', earned: true, icon: 'trophy' },
  { id: 5, name: 'Green Streak', description: '7-day recycling streak', earned: false, icon: 'flame' },
  { id: 6, name: 'Campus Hero', description: 'Top 10 on leaderboard', earned: false, icon: 'star' },
  { id: 7, name: 'Zero Waste', description: 'Recycled 50kg total', earned: false, icon: 'globe' },
  { id: 8, name: 'SDG Champion', description: 'Complete all SDG missions', earned: false, icon: 'target' },
];

export const educationalContent = [
  {
    id: 1,
    title: 'Understanding the 17 SDGs',
    description: 'A comprehensive guide to the United Nations Sustainable Development Goals and how UOW Malaysia contributes.',
    date: '2026-06-01',
    category: 'Article',
  },
  {
    id: 2,
    title: 'Plastic-Free Campus Campaign',
    description: 'Join our initiative to reduce single-use plastics across campus by 50% this semester.',
    date: '2026-06-15',
    category: 'Campaign',
  },
  {
    id: 3,
    title: 'How to Sort Your Recycling',
    description: 'Learn the correct way to separate plastics, paper, glass, and e-waste for maximum impact.',
    date: '2026-05-20',
    category: 'Article',
  },
  {
    id: 4,
    title: 'Green Week Challenge',
    description: 'Participate in daily eco-challenges and earn bonus points throughout Green Week.',
    date: '2026-07-01',
    category: 'Campaign',
  },
  {
    id: 5,
    title: 'The Impact of E-Waste',
    description: 'Why proper e-waste disposal matters and where to drop off your old electronics on campus.',
    date: '2026-05-10',
    category: 'Article',
  },
];

export const events = [
  {
    id: 1,
    name: 'Campus Clean-Up Day',
    date: '2026-07-12',
    location: 'Main Quad, UOW Malaysia',
    description: 'Join fellow students for a campus-wide clean-up. Gloves and bags provided. Earn double points!',
  },
  {
    id: 2,
    name: 'Sustainability Workshop: Composting 101',
    date: '2026-07-18',
    location: 'Block B, Room 201',
    description: 'Learn how to start composting at home and on campus with our sustainability team.',
  },
  {
    id: 3,
    name: 'Eco Market Fair',
    date: '2026-07-25',
    location: 'Student Centre Lawn',
    description: 'Browse local eco-friendly vendors, swap items, and learn about green startups.',
  },
  {
    id: 4,
    name: 'Recycling Drive: E-Waste Collection',
    date: '2026-08-02',
    location: 'Parking Lot C',
    description: 'Bring your old phones, laptops, and cables for responsible e-waste recycling.',
  },
];

export const initialDeposits = [
  { id: 1, userName: 'Wei Ming Lee', date: '2026-07-04', category: 'Plastic Bottles', kg: 3.2, status: 'Pending' },
  { id: 2, userName: 'Nurul Aisyah', date: '2026-07-03', category: 'Paper & Cardboard', kg: 5.0, status: 'Pending' },
  { id: 3, userName: 'Raj Patel', date: '2026-07-03', category: 'Aluminium Cans', kg: 1.8, status: 'Pending' },
  { id: 4, userName: 'Siti Aminah', date: '2026-07-02', category: 'Glass', kg: 2.4, status: 'Pending' },
  { id: 5, userName: 'John Doe', date: '2026-07-01', category: 'E-Waste', kg: 4.5, status: 'Pending' },
];

export const initialContentMissions = [
  {
    id: 1,
    title: 'Plastic-Free Campus Campaign',
    type: 'Mission',
    tags: ['SDG 12', 'Plastic'],
    publishDate: '2026-06-15',
    body: 'Join our initiative to reduce single-use plastics across campus.',
    status: 'Published',
  },
  {
    id: 2,
    title: 'Understanding the 17 SDGs',
    type: 'Content',
    tags: ['SDG', 'Education'],
    publishDate: '2026-06-01',
    body: 'A comprehensive guide to the United Nations Sustainable Development Goals.',
    status: 'Published',
  },
  {
    id: 3,
    title: 'Green Week Challenge Draft',
    type: 'Mission',
    tags: ['SDG 13', 'Challenge'],
    publishDate: '2026-07-01',
    body: 'Daily eco-challenges throughout Green Week.',
    status: 'Draft',
  },
];

export const initialRewardsAdmin = [
  { id: 1, name: 'UOW Malaysia T-Shirt', description: 'Official campus eco tee', pointsRequired: 500 },
  { id: 2, name: 'Reusable Water Bottle', description: 'Stainless steel bottle with UOW logo', pointsRequired: 300 },
  { id: 3, name: 'Campus Cafeteria Voucher (RM10)', description: 'Valid at all campus food outlets', pointsRequired: 200 },
];

export const initialRedemptionRequests = [
  { id: 1, userName: 'Aaron Tan Wen Zhuan', reward: 'Reusable Water Bottle', points: 300, date: '2026-07-02', status: 'Pending' },
  { id: 2, userName: 'Priya Sharma', reward: 'UOW Malaysia T-Shirt', points: 500, date: '2026-07-01', status: 'Pending' },
  { id: 3, userName: 'Wei Ming Lee', reward: 'Eco Tote Bag', points: 150, date: '2026-06-28', status: 'Pending' },
];

export const adminModules = [
  {
    id: 'deposits',
    title: 'Deposit Approval',
    description: 'Review and approve student recycling deposits',
    path: '/admin/deposits',
    icon: 'check-circle',
    roles: ['moderator', 'system_admin'],
  },
  {
    id: 'qr',
    title: 'Issue Recycling QR',
    description: 'Generate and download QR codes for on-site recycling',
    path: '/admin/qr',
    icon: 'badge',
    roles: ['moderator', 'system_admin'],
  },
  {
    id: 'content',
    title: 'Content & Mission Authoring',
    description: 'Create and manage educational content and missions',
    path: '/admin/content',
    icon: 'edit',
    roles: ['content_manager', 'system_admin'],
  },
  {
    id: 'badges-admin',
    title: 'Badge Authoring',
    description: 'Set badge name, requirement, and bonus points',
    path: '/admin/badges',
    icon: 'badge',
    roles: ['content_manager', 'system_admin'],
  },
  {
    id: 'mission-reviews',
    title: 'Mission Reviews',
    description: 'Approve or reject student mission proofs',
    path: '/admin/mission-reviews',
    icon: 'check-circle',
    roles: ['content_manager', 'system_admin'],
  },
  {
    id: 'rewards',
    title: 'Rewards Administration',
    description: 'Manage reward catalogue and stock',
    path: '/admin/rewards',
    icon: 'gift',
    roles: ['rewards_manager', 'system_admin'],
  },
  {
    id: 'redemptions',
    title: 'Redemption Requests',
    description: 'Process student pickup tickets',
    path: '/admin/redemptions',
    icon: 'check-circle',
    roles: ['rewards_manager', 'system_admin'],
  },
  {
    id: 'analytics',
    title: 'Analytics & Reporting',
    description: 'View campus recycling analytics and reports',
    path: '/admin/analytics',
    icon: 'chart',
    roles: ['data_analyst', 'system_admin'],
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    description: 'Review system admin activity and security audit trail',
    path: '/admin/audit-logs',
    icon: 'content',
    roles: ['system_admin'],
  },
];
