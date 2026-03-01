import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerType: string;
  providerName: string;
  appointmentId: string;
  onReviewSubmitted?: () => void;
}

const ReviewDialog = ({
  open,
  onOpenChange,
  providerId,
  providerType,
  providerName,
  appointmentId,
  onReviewSubmitted,
}: ReviewDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please login first"); return; }

    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: session.user.id,
      provider_id: providerId,
      provider_type: providerType,
      rating,
      comment: comment.trim() || null,
      appointment_id: appointmentId,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You already reviewed this appointment");
      } else {
        toast.error("Failed to submit review");
      }
    } else {
      toast.success("Review submitted! Thank you 🎉");
      onOpenChange(false);
      setRating(0);
      setComment("");
      onReviewSubmitted?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Rate your experience</DialogTitle>
          <DialogDescription>How was your visit with {providerName}?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoveredRating || rating)
                      ? "fill-warning text-warning"
                      : "text-border"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {rating === 1 && "Poor 😞"}
            {rating === 2 && "Fair 😐"}
            {rating === 3 && "Good 🙂"}
            {rating === 4 && "Very Good 😊"}
            {rating === 5 && "Excellent 🤩"}
          </p>

          <Textarea
            placeholder="Tell us about your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="rounded-xl"
          />

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full gradient-primary text-primary-foreground rounded-xl h-11"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
