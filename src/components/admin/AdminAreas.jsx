import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'

export default function AdminAreas() {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAreaName, setNewAreaName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAreas()
  }, [])

  const fetchAreas = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw error
      setAreas(data || [])
    } catch (err) {
      console.error('Error fetching areas:', err)
      setError('No se pudieron cargar las áreas. Verifica la conexión con Supabase.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddArea = async (e) => {
    e.preventDefault()
    if (!newAreaName.trim()) return

    setSaving(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('areas')
        .insert([{ nombre: newAreaName.trim() }])
        .select()

      if (error) throw error
      
      setAreas([...areas, ...data])
      setNewAreaName('')
    } catch (err) {
      console.error('Error adding area:', err)
      setError('Error al crear el área. RLS o conexión fallida.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteArea = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta área?')) return

    try {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setAreas(areas.filter(a => a.id !== id))
    } catch (err) {
      console.error('Error deleting area:', err)
      setError('No se pudo eliminar el área.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-text">Gestión de Áreas</h2>
          <p className="text-brand-muted">Administración de departamentos municipales</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="card-brand">
        <h3 className="text-lg font-semibold mb-4">Nueva Área</h3>
        <form onSubmit={handleAddArea} className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: Desarrollo Social"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            className="flex-1"
          />
          <button 
            type="submit" 
            disabled={saving || !newAreaName}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            <span>Agregar</span>
          </button>
        </form>
      </div>

      <div className="card-brand">
        <h3 className="text-lg font-semibold mb-4">Áreas Existentes</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-brand-accent" size={32} />
          </div>
        ) : areas.length === 0 ? (
          <p className="text-brand-muted text-center py-8">No hay áreas registradas.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-brand-border">
            <table className="w-full text-left">
              <thead className="bg-brand-panel text-brand-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {areas.map((area) => (
                  <tr key={area.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs text-brand-muted font-mono">{area.id}</td>
                    <td className="px-6 py-4 text-brand-text font-medium">{area.nombre}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteArea(area.id)}
                        className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
