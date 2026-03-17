import { type ComponentType, useEffect, useRef } from 'react';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { VisualizationElement, ViewBoxPosition } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath, ClusteringConfig } from '@/visualizations/VisualizationRendererProps';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ToggleDefinition } from './ToggleDefinition';
import type { QuizSessionState } from './QuizSessionState';
import { useFreeRecallSession } from './free-recall/useFreeRecallSession';
import { FreeRecallMode } from './free-recall/FreeRecallMode';
import { IdentifyMode } from './identify/IdentifyMode';
import { LocateMode } from './locate/LocateMode';
import styles from './ModeAdapter.module.css';

export interface ModeAdapterProps {
  readonly mode: QuizModeType;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
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
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  clustering,
  onStatusChange,
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
          clustering={clustering}
          onStatusChange={onStatusChange}
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
          clustering={clustering}
          onStatusChange={onStatusChange}
        />
      );
    case 'locate':
      return (
        <LocateAdapter
          elements={elements}
          toggleDefinitions={toggleDefinitions}
          toggleValues={toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
          onStatusChange={onStatusChange}
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
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
}

function FreeRecallAdapter({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  clustering,
  onStatusChange,
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

  useEffect(() => {
    if (session.status === 'finished' && !hasReportedFinish.current) {
      hasReportedFinish.current = true;
      onStatusChangeRef.current('finished', session.score);
    }
  }, [session.status, session.score]);

  return (
    <div className={styles.container}>
      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={session.elementStates}
          toggles={toggleValues}
          elementToggles={elementToggles}
          targetElementId={session.lastMatchedElementId}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
        />
      </div>
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
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
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
  clustering,
  onStatusChange,
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
          onElementClick={renderProps.onElementClick}
          targetElementId={renderProps.targetElementId}
          toggles={renderProps.toggles}
          elementToggles={renderProps.elementToggles}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
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
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
}

function LocateAdapter({
  elements,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  clustering,
  onStatusChange,
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
      clustering={clustering}
      onFinish={handleFinish}
    />
  );
}
