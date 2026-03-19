import { type ComponentType, useEffect, useMemo, useRef } from 'react';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { VisualizationElement, ViewBoxPosition } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath, ClusteringConfig, VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ToggleDefinition } from './ToggleDefinition';
import type { QuizSessionState } from './QuizSessionState';
import { useFreeRecallSession } from './free-recall/useFreeRecallSession';
import { FreeRecallMode } from './free-recall/FreeRecallMode';
import { IdentifyMode } from './identify/IdentifyMode';
import { PromptedRecallMode } from './prompted-recall/PromptedRecallMode';
import { OrderedRecallMode } from './ordered-recall/OrderedRecallMode';
import { LocateMode } from './locate/LocateMode';
import { MultipleChoiceMode } from './multiple-choice/MultipleChoiceMode';
import { isFlagGridElement } from '@/visualizations/flag-grid/FlagGridElement';
import { TimelineLocateMode } from './locate/TimelineLocateMode';
import type { DatePrecision } from '@/scoring/calculateTimelineLocateScore';
import { buildReviewElementStates, buildReviewElementToggles } from './buildReviewStates';
import styles from './ModeAdapter.module.css';

export interface ModeAdapterProps {
  readonly mode: QuizModeType;
  readonly visualizationType?: VisualizationType;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly selectValues?: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  /** When true, the mode should immediately give up and report its final score. */
  readonly forceGiveUp?: boolean;
  /** When true, the quiz is in review mode — no answers accepted, missed items labeled. */
  readonly reviewing?: boolean;
  readonly initialViewBox?: VisualizationRendererProps['initialViewBox'];
}

const noop = () => {};
const noopPosition = (_position: ViewBoxPosition) => {};
const noopChoice = (_index: number) => {};

/**
 * Routes quiz mode type to the correct mode component + renderer composition.
 * Each mode has a different composition pattern; ModeAdapter normalizes them.
 */
export function ModeAdapter({
  mode,
  visualizationType,
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  selectValues,
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  onStatusChange,
  forceGiveUp = false,
  reviewing = false,
  initialViewBox,
}: ModeAdapterProps) {
  switch (mode) {
    case 'free-recall-unordered':
      return (
        <FreeRecallAdapter
          elements={elements}
          dataRows={dataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          toggleValues={toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialViewBox={initialViewBox}
          onStatusChange={onStatusChange}
          forceGiveUp={forceGiveUp}
          reviewing={reviewing}
        />
      );
    case 'identify':
      return (
        <IdentifyAdapter
          elements={elements}
          dataRows={dataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          toggleValues={toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialViewBox={initialViewBox}
          onStatusChange={onStatusChange}
          forceGiveUp={forceGiveUp}
          reviewing={reviewing}
        />
      );
    case 'prompted-recall':
      return (
        <PromptedRecallAdapter
          elements={elements}
          dataRows={dataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          toggleValues={toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
          initialViewBox={initialViewBox}
          onStatusChange={onStatusChange}
          forceGiveUp={forceGiveUp}
          reviewing={reviewing}
        />
      );
    case 'free-recall-ordered':
      return (
        <OrderedRecallAdapter
          elements={elements}
          dataRows={dataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          toggleValues={toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
          initialViewBox={initialViewBox}
          onStatusChange={onStatusChange}
          forceGiveUp={forceGiveUp}
          reviewing={reviewing}
        />
      );
    case 'locate':
      if (visualizationType === 'timeline') {
        return (
          <TimelineLocateAdapter
            elements={elements}
            toggleDefinitions={toggleDefinitions}
            toggleValues={toggleValues}
            selectValues={selectValues}
            Renderer={Renderer}
            backgroundPaths={backgroundPaths}
            clustering={clustering}
            onStatusChange={onStatusChange}
            forceGiveUp={forceGiveUp}
            reviewing={reviewing}
          />
        );
      }
      return (
        <LocateAdapter
          elements={elements}
          toggleDefinitions={toggleDefinitions}
          toggleValues={toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          onStatusChange={onStatusChange}
          forceGiveUp={forceGiveUp}
          reviewing={reviewing}
        />
      );
    case 'multiple-choice':
      return (
        <MultipleChoiceAdapter
          elements={elements}
          onStatusChange={onStatusChange}
          forceGiveUp={forceGiveUp}
        />
      );
    default:
      return (
        <div className={styles.unavailable}>
          <p className={styles.unavailableText}>
            This mode is not yet available.
          </p>
        </div>
      );
  }
}

interface FreeRecallAdapterProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  readonly forceGiveUp: boolean;
  readonly reviewing: boolean;
  readonly initialViewBox?: VisualizationRendererProps['initialViewBox'];
}

function FreeRecallAdapter({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  onStatusChange,
  forceGiveUp,
  reviewing,
  initialViewBox,
}: FreeRecallAdapterProps) {
  const { session, elementToggles, handleTextAnswer, handleGiveUp } = useFreeRecallSession({
    elements,
    dataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
    toggleDefinitions,
    toggleValues,
  });

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const hasReportedFinish = useRef(false);

  // Force give-up when timer expires
  useEffect(() => {
    if (forceGiveUp && session.status !== 'finished') {
      handleGiveUp();
    }
  }, [forceGiveUp, session.status, handleGiveUp]);

  useEffect(() => {
    if (session.status === 'finished' && !hasReportedFinish.current) {
      hasReportedFinish.current = true;
      onStatusChangeRef.current('finished', session.score);
    }
  }, [session.status, session.score]);

  const toggleKeys = useMemo(
    () => toggleDefinitions.map((t) => t.key),
    [toggleDefinitions],
  );

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(session.elementStates) : session.elementStates,
    [reviewing, session.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleKeys) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleKeys],
  );

  return (
    <div className={styles.container}>
      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          targetElementId={reviewing ? undefined : session.lastMatchedElementId}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialViewBox={initialViewBox}
        />
      </div>
      {!reviewing && (
        <div className={styles.controls}>
          <FreeRecallMode
            elements={elements}
            dataRows={dataRows}
            columnMappings={columnMappings}
            toggleDefinitions={toggleDefinitions}
            session={session}
            onTextAnswer={handleTextAnswer}
            onElementSelect={noop}
            onPositionSelect={noopPosition}
            onChoiceSelect={noopChoice}
            onHintRequest={noop}
            onSkip={noop}
            onGiveUp={handleGiveUp}
          />
        </div>
      )}
    </div>
  );
}

interface IdentifyAdapterProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  readonly forceGiveUp: boolean;
  readonly reviewing: boolean;
  readonly initialViewBox?: VisualizationRendererProps['initialViewBox'];
}

const STUB_SESSION: QuizSessionState = {
  toggles: {},
  elementStates: {},
  remainingElementIds: [],
  correctElementIds: [],
  incorrectElementIds: [],
  status: 'active',
  elapsedMs: 0,
  score: { correct: 0, total: 0, percentage: 0 },
};

function IdentifyAdapter({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  onStatusChange,
  forceGiveUp,
  reviewing,
  initialViewBox,
}: IdentifyAdapterProps) {
  const handleFinish = (score: ScoreResult) => {
    onStatusChange('finished', score);
  };

  return (
    <IdentifyMode
      elements={elements}
      dataRows={dataRows}
      columnMappings={columnMappings}
      toggleDefinitions={toggleDefinitions}
      toggleValues={toggleValues}
      session={STUB_SESSION}
      onFinish={handleFinish}
      forceGiveUp={forceGiveUp}
      reviewing={reviewing}
      onTextAnswer={noop}
      onElementSelect={noop}
      onPositionSelect={noopPosition}
      onChoiceSelect={noopChoice}
      onHintRequest={noop}
      onSkip={noop}
      onGiveUp={noop}
      renderVisualization={(renderProps) => (
        <Renderer
          elements={elements}
          elementStates={renderProps.elementStates}
          onElementClick={reviewing ? undefined : renderProps.onElementClick}
          targetElementId={reviewing ? undefined : renderProps.targetElementId}
          toggles={renderProps.toggles}
          elementToggles={renderProps.elementToggles}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialViewBox={initialViewBox}
        />
      )}
    />
  );
}

interface LocateAdapterProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  readonly forceGiveUp: boolean;
  readonly reviewing: boolean;
  readonly initialViewBox?: VisualizationRendererProps['initialViewBox'];
}

function LocateAdapter({
  elements,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  onStatusChange,
  forceGiveUp,
  reviewing,
  initialViewBox,
}: LocateAdapterProps) {
  const handleFinish = (score: ScoreResult) => {
    onStatusChange('finished', score);
  };

  return (
    <LocateMode
      elements={elements}
      toggles={toggleValues}
      toggleDefinitions={toggleDefinitions}
      Renderer={Renderer}
      backgroundPaths={backgroundPaths}
      backgroundLabels={backgroundLabels}
      clustering={clustering}
      onFinish={handleFinish}
      forceGiveUp={forceGiveUp}
      reviewing={reviewing}
      initialViewBox={initialViewBox}
    />
  );
}

interface RenderVisualizationAdapterProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  readonly forceGiveUp: boolean;
  readonly reviewing: boolean;
  readonly initialViewBox?: VisualizationRendererProps['initialViewBox'];
}

function PromptedRecallAdapter({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  clustering,
  onStatusChange,
  forceGiveUp,
  reviewing,
  initialViewBox,
}: RenderVisualizationAdapterProps) {
  const handleFinish = (score: ScoreResult) => {
    onStatusChange('finished', score);
  };

  return (
    <PromptedRecallMode
      elements={elements}
      dataRows={dataRows}
      columnMappings={columnMappings}
      toggleDefinitions={toggleDefinitions}
      toggleValues={toggleValues}
      session={STUB_SESSION}
      onFinish={handleFinish}
      forceGiveUp={forceGiveUp}
      reviewing={reviewing}
      onTextAnswer={noop}
      onElementSelect={noop}
      onPositionSelect={noopPosition}
      onChoiceSelect={noopChoice}
      onHintRequest={noop}
      onSkip={noop}
      onGiveUp={noop}
      renderVisualization={(renderProps) => (
        <Renderer
          elements={elements}
          elementStates={renderProps.elementStates}
          toggles={renderProps.toggles}
          elementToggles={renderProps.elementToggles}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
          initialViewBox={initialViewBox}
        />
      )}
    />
  );
}

function OrderedRecallAdapter({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  clustering,
  onStatusChange,
  forceGiveUp,
  reviewing,
}: RenderVisualizationAdapterProps) {
  const handleFinish = (score: ScoreResult) => {
    onStatusChange('finished', score);
  };

  return (
    <OrderedRecallMode
      elements={elements}
      dataRows={dataRows}
      columnMappings={columnMappings}
      toggleDefinitions={toggleDefinitions}
      toggleValues={toggleValues}
      session={STUB_SESSION}
      onFinish={handleFinish}
      forceGiveUp={forceGiveUp}
      reviewing={reviewing}
      onTextAnswer={noop}
      onElementSelect={noop}
      onPositionSelect={noopPosition}
      onChoiceSelect={noopChoice}
      onHintRequest={noop}
      onSkip={noop}
      onGiveUp={noop}
      renderVisualization={(renderProps) => (
        <Renderer
          elements={elements}
          elementStates={renderProps.elementStates}
          toggles={renderProps.toggles}
          elementToggles={renderProps.elementToggles}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
        />
      )}
    />
  );
}

interface MultipleChoiceAdapterProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  readonly forceGiveUp: boolean;
}

function renderFlagChoice(element: VisualizationElement): React.ReactNode {
  if (isFlagGridElement(element)) {
    return <img src={element.flagUrl} alt="" />;
  }
  return <span>{element.label}</span>;
}

function MultipleChoiceAdapter({
  elements,
  onStatusChange,
  forceGiveUp,
}: MultipleChoiceAdapterProps) {
  const handleFinish = (score: ScoreResult) => {
    onStatusChange('finished', score);
  };

  return (
    <MultipleChoiceMode
      elements={elements}
      renderChoice={renderFlagChoice}
      onFinish={handleFinish}
      forceGiveUp={forceGiveUp}
    />
  );
}

interface TimelineLocateAdapterProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectValues?: Readonly<Record<string, string>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
  readonly forceGiveUp: boolean;
  readonly reviewing: boolean;
}

function TimelineLocateAdapter({
  elements,
  toggleDefinitions,
  toggleValues,
  selectValues,
  Renderer,
  backgroundPaths,
  clustering,
  onStatusChange,
  forceGiveUp,
  reviewing,
}: TimelineLocateAdapterProps) {
  const handleFinish = (score: ScoreResult) => {
    onStatusChange('finished', score);
  };

  const rawPrecision = selectValues?.['datePrecision'];
  const datePrecision: DatePrecision =
    rawPrecision === 'year' || rawPrecision === 'month' || rawPrecision === 'day'
      ? rawPrecision
      : 'month';

  return (
    <TimelineLocateMode
      elements={elements}
      toggles={toggleValues}
      toggleDefinitions={toggleDefinitions}
      Renderer={Renderer}
      backgroundPaths={backgroundPaths}
      clustering={clustering}
      onFinish={handleFinish}
      forceGiveUp={forceGiveUp}
      reviewing={reviewing}
      datePrecision={datePrecision}
    />
  );
}
