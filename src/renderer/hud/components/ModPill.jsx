import { AnimatePresence, motion } from 'framer-motion'

export default function ModPill({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="mod-pill"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          MOD
        </motion.div>
      )}
    </AnimatePresence>
  )
}
