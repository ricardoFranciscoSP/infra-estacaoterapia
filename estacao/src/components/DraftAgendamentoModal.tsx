'use client';
import React from 'react';
import { Dialog, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface DraftAgendamentoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DraftAgendamentoModal: React.FC<DraftAgendamentoModalProps> = ({ open, onClose, onConfirm }) => {
  // Handler para garantir que ao clicar em "Não" ou fechar o modal, limpe o storage
  const handleClose = () => {
    // Remove o draftId do localStorage quando fechar o modal
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('draftId');
    }
    // Chama o onClose do componente pai
    onClose();
  };

  // Handler específico para o botão "Não"
  const handleNoClick = () => {
    // Remove o draftId do localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('draftId');
    }
    // Fecha o modal
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={false}
      PaperProps={{
        sx: {
          borderRadius: { xs: '16px', md: '16px' },
          p: 0,
          m: 0,
        },
      }}
    >
      {/* Header customizado para padrão dos modais */}
      <div
        style={{
          width: '100%',
          background: '#8494E9',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: '20px 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: '#fff',
            fontWeight: 700,
            fontSize: { xs: '1.1rem', md: '1.25rem' },
            textAlign: 'center',
            width: '100%',
            letterSpacing: 0.2,
          }}
        >
          Agendamento em andamento
        </Typography>
        {/* Botão de fechar no header, padrão dos outros modais */}
        <Button
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            minWidth: 0,
            width: 32,
            height: 32,
            color: '#fff',
            fontSize: 24,
            borderRadius: '50%',
            p: 0,
            lineHeight: 1,
            '&:hover': { background: 'rgba(255,255,255,0.08)' },
            zIndex: 2,
          }}
          aria-label="Fechar"
        >
          ×
        </Button>
      </div>
      <DialogContent sx={{ pt: 3, pb: 1, px: { xs: 2, md: 4 } }}>
        <Typography align="center" variant="body1" sx={{ mb: 2, fontWeight: 500, color: '#49525A', fontSize: { xs: '1rem', md: '1.1rem' } }}>
          Você possui um agendamento não finalizado. Deseja continuar com seu agendamento?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3, px: { xs: 2, md: 4 } }}>
        <Button variant="outlined" color="secondary" onClick={handleNoClick} sx={{ minWidth: 100, fontWeight: 600, fontSize: { xs: '1rem', md: '1.05rem' } }}>
          Não
        </Button>
        <Button variant="contained" color="primary" onClick={onConfirm} sx={{ minWidth: 100, fontWeight: 700, fontSize: { xs: '1rem', md: '1.05rem' } }}>
          Sim
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DraftAgendamentoModal;
