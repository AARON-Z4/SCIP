import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

export default function Layout() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <NavBar />
            <main className="flex-1">
                <Outlet />
            </main>
            <footer className="border-t border-border bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        © 2026 Smart Complaint Intelligence System. Government Grievance Portal.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Powered by AI · Version 2.1.0
                    </p>
                </div>
            </footer>
        </div>
    );
}
