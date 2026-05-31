export const cleanEvaluatorNote = (message: string) => {
    if (message.includes('No eligible manager reviewer')) return 'Manager not found.';
    if (message.includes('No subordinates')) return 'No subordinate reviewers found.';
    if (message.includes('No active team')) return 'Team not set.';
    if (message.includes('No current department')) return 'Department not set.';
    if (message.includes('eligible peer')) return 'Fewer peer reviewers are available.';
    if (message.includes('eligible subordinate')) return 'Fewer subordinate reviewers are available.';
    if (message.includes('manual evaluator')) return 'Evaluator added by HR was kept.';
    return message;
};

export const getLaunchBannerCopy = (params: {
    launchReady: boolean;
    setupReady: boolean;
    campaignStatus?: string | null;
}) => {
    const { launchReady, setupReady, campaignStatus } = params;

    if (launchReady) {
        return {
            title: 'Ready to launch',
            message: 'Setup is validated and locked. Launching this campaign will open feedback collection.',
        };
    }

    if (setupReady && campaignStatus === 'DRAFT') {
        return {
            title: 'Ready for final validation',
            message: 'All setup checks pass. Validate the setup first, then launch the campaign.',
        };
    }

    return {
        title: 'Needs attention',
        message: 'Fix the items below before launching this campaign.',
    };
};

export const workflowErrorMessage = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback;
