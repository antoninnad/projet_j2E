import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { contributors } from "@/data/workspace"

export function ContributorAvatars({ ids }: { ids: string[] }) {
  const people = ids.map(id => contributors.find(person => person.id === id)).filter(person => person !== undefined)
  const remaining = people.slice(3)
  return (
    <div className="flex items-center gap-3" aria-label="Personnes ayant modifié ce fichier">
      <span className="hidden text-xs text-muted-foreground xl:block">Modifié par</span>
      <AvatarGroup>
        {people.slice(0, 3).map(person => (
          <Avatar key={person.id} title={person.name}>
            <AvatarImage src={person.avatar} alt={person.name} />
            <AvatarFallback>{person.initials}</AvatarFallback>
          </Avatar>
        ))}
        {remaining.length > 0 && <AvatarGroupCount title={remaining.map(person => person.name).join(", ")} aria-label={`${remaining.length} autres contributeurs : ${remaining.map(person => person.name).join(", ")}`}>+{remaining.length}</AvatarGroupCount>}
      </AvatarGroup>
    </div>
  )
}
