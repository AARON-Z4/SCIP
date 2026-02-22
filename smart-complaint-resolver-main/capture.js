import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    const urls = [
        { path: '/', name: '1_home_page.png' },
        { path: '/submit', name: '2_submit_complaint.png' },
        { path: '/analysis', name: '3_ai_analysis.png' },
        { path: '/duplicate', name: '4_duplicate_detected.png' },
        { path: '/track?id=CMP-98765', name: '5_track_complaint.png' },
        { path: '/admin', name: '6_admin_dashboard.png' },
        { path: '/registered', name: '7_complaint_registered.png' }
    ];

    const browser = await chromium.launch();

    // Create a context and mock API calls if needed
    const context = await browser.newContext();
    const page = await context.newPage();

    // Wait for the servers to be fully up
    await new Promise(r => setTimeout(r, 2000));

    // Intercept API calls to /auth/me to return valid user
    await page.route('**/auth/me', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'mock-user-id',
                email: 'mock@example.com',
                full_name: 'Mock User',
                role: 'admin',
                created_at: new Date().toISOString()
            })
        });
    });

    // Mock admin stats since it might fail without real data
    await page.route('**/admin/stats', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                total: 120,
                resolved: 80,
                pending: 30,
                in_progress: 10,
                duplicates_caught: 25,
                by_category: { 'Water Supply': 40, 'Electricity': 80 },
                by_priority: { 'high': 20, 'medium': 50, 'low': 50 }
            })
        });
    });

    // Mock list components
    await page.route('**/admin/complaints*', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { id: '1', reference_id: 'CMP-123', title: 'Test', category: 'Water', location: 'Delhi', priority: 'high', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ])
        });
    });

    // First go to root to set local storage and session storage
    await page.goto(`http://localhost:8080/`, { waitUntil: 'networkidle' });

    await page.evaluate(() => {
        localStorage.setItem('scis_token', 'mock_token');
        localStorage.setItem('scis_user', JSON.stringify({
            id: 'mock-user-id',
            email: 'mock@example.com',
            full_name: 'Mock User',
            role: 'admin',
            created_at: new Date().toISOString()
        }));

        sessionStorage.setItem('analysisResult', JSON.stringify({
            is_duplicate: true,
            message: "Our AI found a similar complaint.",
            complaint: {
                id: "new-123",
                reference_id: "CMP-00001",
                title: "Water leaking on street",
                category: "Water Supply",
                location: "Sector 14",
                priority: "high",
                status: "registered",
                image_urls: [],
                user_id: "mock-user-id",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            duplicate_match: {
                complaint_id: "old-999",
                reference_id: "CMP-98765",
                title: "Major water leak",
                category: "Water Supply",
                location: "Sector 14 near park",
                status: "in_progress",
                created_at: "2026-02-20T10:00:00Z",
                similarity_score: 92,
                reasoning: "High location and text overlap.",
                factor_scores: {
                    text_similarity: 90,
                    location_match: 95,
                    category_match: 100
                }
            }
        }));
    });

    const outputDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const item of urls) {
        console.log(`Navigating to ${item.path}...`);
        try {
            await page.goto(`http://localhost:8080${item.path}`, { waitUntil: 'networkidle', timeout: 10000 });
            await page.waitForTimeout(2000); // Give it a sec to render animations if any (like score counting up)
            const filePath = path.join(outputDir, item.name);
            await page.screenshot({ path: filePath, fullPage: true });
            console.log(`Saved screenshot ${item.name}`);
        } catch (e) {
            console.error(`Error capturing ${item.path}:`, e.message);
        }
    }

    await browser.close();
    console.log('Capture complete!');
})();
