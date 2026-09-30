import { useCallback, useEffect, useState } from 'react'
import { apagarFoto, enviarFoto, listarFotos, naNuvem, ouvirFotos, type FotoEnviada } from '../lib/fotosEnviadas'

/** As fotos que vocês mandaram pelo site (e ficam sabendo na hora quando o outro manda uma) */
export function useFotosEnviadas() {
  const [fotos, setFotos] = useState<FotoEnviada[]>([])
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      setFotos(await listarFotos())
      setErro(null)
    } catch {
      setErro('Não consegui buscar as fotos novas agora.')
    }
  }, [])

  useEffect(() => {
    void recarregar()
    return ouvirFotos(() => void recarregar())
  }, [recarregar])

  const enviar = async (grande: Blob, mini: Blob, legenda?: string) => {
    await enviarFoto(grande, mini, legenda)
    await recarregar()
  }
  const apagar = async (f: FotoEnviada) => {
    await apagarFoto(f)
    await recarregar()
  }

  return { fotos, enviar, apagar, erro, naNuvem }
}
