import { useState } from 'react';
import { HoldingModal } from './components/HoldingModal';
import { LayoutShell } from './components/LayoutShell';
import { ErrorBanner } from './components/Skeletons';
import { useMarketLensState } from './hooks/useMarketLensState';
import { AlertsScreen } from './screens/AlertsScreen';
import { AnalysisDirectoryScreen } from './screens/AnalysisDirectoryScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { LoginScreen } from './screens/LoginScreen';
import { PortfolioScreen } from './screens/PortfolioScreen';
import { StockAnalysisScreen } from './screens/StockAnalysisScreen';
import { HelpScreen, ProfileScreen, SettingsScreen } from './screens/UtilityScreens';
import { WatchlistScreen } from './screens/WatchlistScreen';
import { PortfolioHolding } from './types/market';

export default function App() {
  const state = useMarketLensState();

  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [preselectedTicker, setPreselectedTicker] = useState<string | undefined>(undefined);

  const openAddHoldingModal = (ticker?: string) => {
    setEditingHolding(null);
    setPreselectedTicker(ticker);
    setHoldingModalOpen(true);
  };

  const openEditHoldingModal = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setPreselectedTicker(undefined);
    setHoldingModalOpen(true);
  };

  const handleSaveHolding = (
    data: Omit<PortfolioHolding, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      state.updateHolding({ ...data, id: existingId });
    } else {
      state.addHolding(data);
    }
  };

  if (!state.isAuthenticated) {
    return <LoginScreen onLogin={state.login} />;
  }

  return (
    <LayoutShell
      activeTab={state.activeTab}
      onNavigate={state.navigateTo}
      activeAlertsCount={state.activeAlertsCount}
      onSelectStock={state.openStockAnalysis}
      onRefreshLive={state.refreshLiveData}
      isRefreshing={state.marketLoading}
      lastUpdatedAt={state.lastUpdatedAt}
      onLogout={state.logout}
      userName={state.userName}
    >
      {state.storageError && (
        <div className="mb-6">
          <ErrorBanner
            message={state.storageError}
            retryLabel="Reset Preferences"
            onRetry={state.resetAllData}
            onDismiss={state.dismissStorageError}
          />
        </div>
      )}

      {state.activeTab === 'suggestions' && (
        <DashboardScreen
          isLoading={state.marketLoading}
          marketError={state.marketError}
          onRetryMarket={state.refreshLiveData}
          userName={state.userName}
          portfolioSummary={state.portfolioSummary}
          enrichedHoldings={state.enrichedHoldings}
          indices={state.indices}
          stocks={state.universeStocks}
          watchlist={state.watchlist}
          alerts={state.alerts}
          onNavigate={state.navigateTo}
          onSelectStock={state.openStockAnalysis}
          onDismissAlert={state.dismissAlert}
        />
      )}

      {(state.activeTab === 'requirements' || state.activeTab === 'discover') && (
        <DiscoverScreen
          isLoadingMarket={state.marketLoading}
          isCalculating={state.recommendationLoading}
          stocks={state.universeStocks}
          savedRequirements={state.investmentRequirements}
          savedSession={state.recommendationSession}
          onSubmitRequirements={state.submitInvestmentRequirements}
          onResetRequirements={state.resetInvestmentRequirements}
          watchlistTickers={state.watchlistTickers}
          onToggleWatchlist={state.toggleWatchlist}
          onSelectStock={state.openStockAnalysis}
          onLogHolding={(ticker) => openAddHoldingModal(ticker)}
        />
      )}

      {state.activeTab === 'analysis' && (
        <AnalysisDirectoryScreen
          isLoading={state.marketLoading}
          stocks={state.universeStocks}
          watchlistTickers={state.watchlistTickers}
          onSelectStock={state.openStockAnalysis}
          onToggleWatchlist={state.toggleWatchlist}
        />
      )}

      {state.activeTab === 'analysis-detail' && (
        <StockAnalysisScreen
          symbol={state.selectedStockTicker}
          allStocks={state.universeStocks}
          isWatched={state.watchlistTickers.has(state.selectedStockTicker.toUpperCase())}
          onBackToDirectory={() => state.navigateTo('analysis')}
          onSelectStock={state.openStockAnalysis}
          onToggleWatchlist={state.toggleWatchlist}
          onLogHolding={(ticker) => openAddHoldingModal(ticker)}
        />
      )}

      {state.activeTab === 'portfolio' && (
        <PortfolioScreen
          enrichedHoldings={state.enrichedHoldings}
          portfolioSummary={state.portfolioSummary}
          onOpenAdd={() => openAddHoldingModal()}
          onOpenEdit={openEditHoldingModal}
          onRemoveHolding={state.removeHolding}
          onLoadStarterHoldings={state.loadStarterHoldings}
          onSelectStock={state.openStockAnalysis}
        />
      )}

      {state.activeTab === 'watchlist' && (
        <WatchlistScreen
          watchlist={state.watchlist}
          stocks={state.universeStocks}
          liveQuotes={state.liveQuotes}
          universeMap={state.universeMap}
          onToggleWatchlist={state.toggleWatchlist}
          onUpdateNote={state.updateWatchlistNote}
          onLoadStarterWatchlist={state.loadStarterWatchlist}
          onSelectStock={state.openStockAnalysis}
          onLogHolding={(ticker) => openAddHoldingModal(ticker)}
          onNavigate={state.navigateTo}
        />
      )}

      {state.activeTab === 'notifications' && (
        <AlertsScreen
          alerts={state.alerts}
          stocks={state.universeStocks}
          userEmail={state.userEmail}
          notificationSettings={state.notificationSettings}
          onUpdateSettings={state.updateNotificationSettings}
          onSendEmailNow={state.sendAlertEmailNow}
          emailDeliveryState={state.emailDeliveryState}
          onDismissAlert={state.dismissAlert}
          onRestoreAlert={state.restoreAlert}
          onMarkRead={state.markAlertRead}
          onMarkAllRead={state.markAllAlertsRead}
          onRestoreAllAlerts={state.restoreAllAlerts}
          onCreateCustomAlert={state.createCustomAlert}
          onSelectStock={state.openStockAnalysis}
        />
      )}

      {state.activeTab === 'profile' && (
        <ProfileScreen
          userName={state.userName}
          userEmail={state.userEmail}
          holdingsCount={state.enrichedHoldings.length}
          watchlistCount={state.watchlist.length}
          onUpdateUserEmail={state.updateUserEmail}
          onResetWorkspace={state.resetAllData}
          onLogout={state.logout}
        />
      )}

      {state.activeTab === 'settings' && (
        <SettingsScreen
          notificationSettings={state.notificationSettings}
          onUpdateSettings={state.updateNotificationSettings}
          onNavigate={state.navigateTo}
        />
      )}

      {state.activeTab === 'help' && <HelpScreen />}

      <HoldingModal
        isOpen={holdingModalOpen}
        onClose={() => setHoldingModalOpen(false)}
        stocks={state.universeStocks}
        initialHolding={editingHolding}
        preselectedTicker={preselectedTicker}
        onSave={handleSaveHolding}
      />

      {state.toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-700"
        >
          {state.toastMessage}
        </div>
      )}
    </LayoutShell>
  );
}
