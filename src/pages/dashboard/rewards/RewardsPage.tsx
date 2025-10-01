import React from 'react';
import { Link } from 'react-router-dom';

const RewardsPage: React.FC = () => {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
            <div className="max-w-xl">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
                    <span className="text-3xl font-semibold">🎁</span>
                </div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Rewards Coming Soon
                </h1>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                    We are crafting a rewarding experience. Track points, redeem perks, and engage more deeply with the platform.
                </p>

                <div className="inline-flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        Refresh
                    </button>
                    <Link
                        to="/dashboard"
                        className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            Planned Features
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li>• Earn points for key actions</li>
                            <li>• Tiered reward levels</li>
                            <li>• Redeemable perks & bonuses</li>
                            <li>• Activity & history tracking</li>
                        </ul>
                </div>
            </div>

            <footer className="mt-10 text-xs text-gray-400 dark:text-gray-500">
                v0.1 preview
            </footer>
        </div>
    );
};

export default RewardsPage;