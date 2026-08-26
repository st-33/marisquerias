/**
 * Estilos del PanelInventario (separados del componente).
 */

import { StyleSheet } from 'react-native';
import { theme } from '@compartido/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column', // Changed to column to accommodate header tabs
    backgroundColor: '#0f172a',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- TABS ---
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  // --- COLS ---
  leftCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    padding: 20,
  },
  rightCol: {
    flex: 1,
    padding: 20,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#1e3a8a', // Dark blue bg
  },
  itemName: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 15,
  },
  itemSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  stockBadge: {
    alignItems: 'flex-end',
  },
  stockValue: {
    color: theme.colors.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  stockLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  cardsScroll: {
    maxHeight: 100,
    marginBottom: 20,
  },
  metricCard: {
    width: 140,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 15,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  metricVal: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  areasGrid: {
    maxHeight: 120,
    marginBottom: 30,
  },
  areaChip: {
    width: 100,
    height: 90,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  areaChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#334155',
  },
  areaChipName: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  areaChipSmall: {
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  distArea: {
    flex: 1,
    color: 'white',
    fontWeight: '600',
  },
  distQty: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 15,
  },
  actionIcon: {
    padding: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    marginLeft: 8,
  },
  // --- MODALS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  unitBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unitText: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 2,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  confirmText: {
    color: 'white',
    fontWeight: '900',
  },
});
