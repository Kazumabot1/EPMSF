import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DEFAULT_EVALUATOR_CONFIG, normalizeEvaluatorConfig } from '../../../types/feedbackCampaign';
import type { EvaluatorConfigInput } from '../../../types/feedbackCampaign';

const evaluatorConfigSchema = z
    .object({
        includeManager: z.boolean(),
        includePeers: z.boolean(),
        includeSubordinates: z.boolean(),
        includeSelf: z.boolean(),
        peerMinCount: z.number().int().min(0),
        peerMaxCount: z.number().int().positive('Maximum peer count must be greater than zero.'),
        subordinateMinCount: z.number().int().min(0),
        subordinateMaxCount: z.number().int().min(0),
        flexibleMode: z.boolean(),
        includeTeamPeers: z.boolean(),
        includeDepartmentPeers: z.boolean(),
        includeProjectPeers: z.boolean(),
        includeCrossTeamPeers: z.boolean(),
        peerCount: z.number().int().positive('Peer count must be greater than zero.').optional(),
    })
    .refine(
        (values) =>
            values.includeManager ||
            values.includeSelf ||
            values.includeSubordinates ||
            values.includePeers,
        {
            message: 'Select at least one evaluator role.',
            path: ['includeManager'],
        },
    )
    .refine((values) => values.peerMinCount <= values.peerMaxCount, {
        message: 'Minimum peer count cannot be greater than maximum peer count.',
        path: ['peerMinCount'],
    })
    .refine((values) => values.subordinateMinCount <= values.subordinateMaxCount, {
        message: 'Minimum subordinate count cannot be greater than maximum subordinate count.',
        path: ['subordinateMinCount'],
    })
    .refine(
        (values) =>
            !values.includePeers ||
            values.includeTeamPeers ||
            values.includeDepartmentPeers ||
            values.includeProjectPeers ||
            values.includeCrossTeamPeers,
        {
            message: 'Choose at least one peer source when peer evaluators are enabled.',
            path: ['includeTeamPeers'],
        },
    );

type EvaluatorConfigValues = z.input<typeof evaluatorConfigSchema>;

type EvaluatorConfigComponentProps = {
    initialValues?: EvaluatorConfigInput;
    previewing: boolean;
    generating: boolean;
    onPreview: (payload: EvaluatorConfigInput) => Promise<void> | void;
    onGenerate: (payload: EvaluatorConfigInput) => Promise<void> | void;
};

const defaultValues: EvaluatorConfigValues = normalizeEvaluatorConfig(DEFAULT_EVALUATOR_CONFIG);

const toPayload = (values: EvaluatorConfigValues): EvaluatorConfigInput =>
    normalizeEvaluatorConfig({
        ...values,
        peerCount: values.peerMaxCount,
    });

const EvaluatorConfigComponent = ({
                                      initialValues,
                                      previewing,
                                      generating,
                                      onPreview,
                                      onGenerate,
                                  }: EvaluatorConfigComponentProps) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EvaluatorConfigValues>({
        resolver: zodResolver(evaluatorConfigSchema),
        defaultValues: normalizeEvaluatorConfig(initialValues ?? defaultValues),
    });

    const submitPreview = handleSubmit(async (values) => {
        await onPreview(toPayload(values));
    });

    return (
        <section className="feedback-setup-card">
            <div className="feedback-setup-card-header">
                <div>
                    <p className="feedback-setup-eyebrow">Step 3</p>
                    <h2>Configure evaluator rules</h2>
                </div>
            </div>

            <form
                className="feedback-setup-stack"
                onSubmit={handleSubmit(async (values) => {
                    await onGenerate(toPayload(values));
                })}
            >
                <label className="feedback-setup-checkbox">
                    <input type="checkbox" {...register('includeManager')} />
                    <div>
                        <strong>Include manager reviewer</strong>
                        <span>Uses eligible manager reviewers. Missing reviewer data will produce a warning.</span>
                    </div>
                </label>

                <label className="feedback-setup-checkbox">
                    <input type="checkbox" {...register('includePeers')} />
                    <div>
                        <strong>Include peer feedback</strong>
                        <span>Peers are randomly selected from eligible candidates only, after governance exclusions.</span>
                    </div>
                </label>

                <div className="feedback-setup-nested-options">
                    <label className="feedback-setup-checkbox compact">
                        <input type="checkbox" {...register('includeTeamPeers')} />
                        <div>
                            <strong>Use team peer source</strong>
                            <span>Uses active team members when team data exists.</span>
                        </div>
                    </label>

                    <label className="feedback-setup-checkbox compact">
                        <input type="checkbox" {...register('includeDepartmentPeers')} />
                        <div>
                            <strong>Use department fallback</strong>
                            <span>Uses eligible same-department reviewers when team data is incomplete.</span>
                        </div>
                    </label>

                    <label className="feedback-setup-checkbox compact">
                        <input type="checkbox" {...register('includeProjectPeers')} />
                        <div>
                            <strong>Use project peer source</strong>
                            <span>Only works when a project membership directory is configured.</span>
                        </div>
                    </label>

                    <label className="feedback-setup-checkbox compact">
                        <input type="checkbox" {...register('includeCrossTeamPeers')} />
                        <div>
                            <strong>Use other-team peers</strong>
                            <span>Extends pool with other active teams in the same department.</span>
                        </div>
                    </label>
                </div>

                <label className="feedback-setup-checkbox">
                    <input type="checkbox" {...register('includeSubordinates')} />
                    <div>
                        <strong>Include subordinate reviewers</strong>
                        <span>Eligible subordinate reviewers provide upward feedback anonymously.</span>
                    </div>
                </label>

                <label className="feedback-setup-checkbox">
                    <input type="checkbox" {...register('includeSelf')} />
                    <div>
                        <strong>Include self feedback</strong>
                        <span>The target employee completes the same dynamic feedback form for self-evaluation.</span>
                    </div>
                </label>

                <div className="feedback-setup-form-grid">
                    <label className="feedback-setup-field">
                        <span>Minimum peer count</span>
                        <input type="number" min={0} {...register('peerMinCount', { valueAsNumber: true })} />
                    </label>
                    <label className="feedback-setup-field">
                        <span>Maximum peer count</span>
                        <input type="number" min={1} {...register('peerMaxCount', { valueAsNumber: true })} />
                    </label>
                    <label className="feedback-setup-field">
                        <span>Minimum subordinate count</span>
                        <input type="number" min={0} {...register('subordinateMinCount', { valueAsNumber: true })} />
                    </label>
                    <label className="feedback-setup-field">
                        <span>Maximum subordinate count</span>
                        <input type="number" min={0} {...register('subordinateMaxCount', { valueAsNumber: true })} />
                    </label>
                </div>

                <label className="feedback-setup-checkbox">
                    <input type="checkbox" {...register('flexibleMode')} />
                    <div>
                        <strong>Flexible mode</strong>
                        <span>Show warnings instead of blocking when some targets do not satisfy minimum role counts.</span>
                    </div>
                </label>

                {errors.includeManager ? <p className="feedback-setup-error">{errors.includeManager.message}</p> : null}
                {errors.includeTeamPeers ? <p className="feedback-setup-error">{errors.includeTeamPeers.message}</p> : null}
                {errors.peerMinCount ? <p className="feedback-setup-error">{errors.peerMinCount.message}</p> : null}
                {errors.peerMaxCount ? <p className="feedback-setup-error">{errors.peerMaxCount.message}</p> : null}
                {errors.subordinateMinCount ? <p className="feedback-setup-error">{errors.subordinateMinCount.message}</p> : null}

                <div className="feedback-setup-actions">
                    <button
                        className="feedback-setup-secondary"
                        disabled={previewing || generating}
                        type="button"
                        onClick={() => void submitPreview()}
                    >
                        {previewing ? 'Previewing...' : 'Preview suggested assignments'}
                    </button>
                    <button className="feedback-setup-primary" disabled={previewing || generating} type="submit">
                        {generating ? 'Saving assignments...' : 'Save generated assignments'}
                    </button>
                </div>

                <p className="feedback-setup-help-text">
                    Regeneration replaces auto-generated assignments only. Existing manual overrides are preserved by default.
                </p>
            </form>
        </section>
    );
};

export default EvaluatorConfigComponent;
