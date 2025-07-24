"use client"

import {
  CaretLeftIcon,
  SealCheckIcon,
  SpinnerIcon,
} from "@phosphor-icons/react"
import { AnimatePresence, motion, type Transition } from "motion/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabled } from "@/lib/supabase/config"

const TRANSITION_CONTENT: Transition = {
  ease: "easeOut",
  duration: 0.2,
}

type FeedbackFormProps = {
  authUserId?: string
  onClose: () => void
}

export function FeedbackForm({ authUserId, onClose }: FeedbackFormProps) {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle")
  const [feedback, setFeedback] = useState("")

  if (!isSupabaseEnabled) {
    return null
  }

  const handleClose = () => {
    setFeedback("")
    setStatus("idle")
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!authUserId) {
      toast({
        title: "Please login to submit feedback",
        status: "error",
      })
      return
    }

    setStatus("submitting")
    if (!feedback.trim()) return

    try {
      const supabase = createClient()

      if (!supabase) {
        toast({
          title: "Feedback is not supported in this deployment",
          status: "info",
        })
        return
      }

      const { error } = await supabase.from("feedback").insert({
        message: feedback,
        user_id: authUserId,
      })

      if (error) {
        toast({
          title: `Error submitting feedback: ${error}`,
          status: "error",
        })
        setStatus("error")
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 1200))

      setStatus("success")

      setTimeout(() => {
        handleClose()
      }, 2500)
    } catch (error) {
      toast({
        title: `Error submitting feedback: ${error}`,
        status: "error",
      })
      setStatus("error")
    }
  }

  return (
    <div className="h-[200px] w-full">
      <AnimatePresence mode="popLayout">
        {status === "success" ? (
          <motion.div
            key="success"
            className="flex h-[200px] w-full flex-col items-center justify-center"
            initial={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(2px)" }}
            transition={TRANSITION_CONTENT}
          >
            <div className="rounded-full bg-green-500/10 p-1">
              <SealCheckIcon className="size-6 text-green-500" />
            </div>
            <p className="mt-3 mb-1 text-center font-medium text-foreground text-sm">
              Thank you for your time!
            </p>
            <p className="text-muted-foreground text-sm">
              Your feedback makes {APP_NAME} better.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="flex h-full flex-col"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(2px)" }}
            transition={TRANSITION_CONTENT}
          >
            <motion.span
              aria-hidden="true"
              initial={{
                opacity: 1,
              }}
              animate={{
                opacity: feedback ? 0 : 1,
              }}
              transition={{
                duration: 0,
              }}
              className="pointer-events-none absolute top-3.5 left-4 select-none text-muted-foreground text-sm leading-[1.4]"
            >
              What would make {APP_NAME} better for you?
            </motion.span>
            <textarea
              className="h-full w-full resize-none rounded-md bg-transparent px-4 py-3.5 text-foreground text-sm outline-hidden"
              onChange={(e) => setFeedback(e.target.value)}
              disabled={status === "submitting"}
            />
            <div
              key="close"
              className="flex justify-between pt-2 pr-3 pb-3 pl-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                aria-label="Close"
                disabled={status === "submitting"}
                className="rounded-lg"
              >
                <CaretLeftIcon size={16} className="text-foreground" />
              </Button>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                aria-label="Submit feedback"
                className="rounded-lg"
                disabled={status === "submitting" || !feedback.trim()}
              >
                <AnimatePresence mode="popLayout">
                  {status === "submitting" ? (
                    <motion.span
                      key="submitting"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={TRANSITION_CONTENT}
                      className="inline-flex items-center gap-2"
                    >
                      <SpinnerIcon className="size-4 animate-spin" />
                      Sending...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="send"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={TRANSITION_CONTENT}
                    >
                      Send
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
