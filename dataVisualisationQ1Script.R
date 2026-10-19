library(jsonlite)
library(dplyr)

data <- fromJSON("data.json")

#preprocessing checks
missing_node_ids <- data$nodes %>% filter(is.na(id))
print(paste("Nodes with missing IDs:", nrow(missing_node_ids)))

missing_names <- data$nodes %>% filter(is.na(name))
print(paste("Number of nodes with missing names:", nrow(missing_names)))

missing_genres <- data$nodes %>% filter(`Node Type` %in% c("Song", "Album") & is.na(genre))
print(paste("Projects with missing genre:", nrow(missing_genres)))

self_loop_nodes <- data$links %>% filter (source == target)
print(paste("Nodes pointing to themselves:", nrow(self_loop_nodes)))

overlap_dates <- data$nodes %>% filter(`Node Type` %in% c("Song", "Album") & !is.na(release_date) & !is.na(written_date)) %>%
  filter(as.numeric(release_date) < as.numeric(written_date))
print(paste("Projects with release before written:", nrow(overlap_dates)))

valid_ids <- data$nodes$id
false_links <- data$links %>% filter(!(source %in% valid_ids) | !(target %in% valid_ids))
print(paste("Links pointing to false nodes:", nrow(false_links)))

chart_before_release <- data$nodes %>% filter(!is.na(notoriety_date) & !is.na(release_date)) %>%
  filter(as.numeric(notoriety_date) < as.numeric(release_date))
print(paste("Projects that charted before they were released:", nrow(chart_before_release)))

linked_ids <- unique(c(data$links$source, data$links$target))
orphan_nodes <- data$nodes %>% filter(!(id %in% linked_ids))
print(paste("Orphan nodes:", nrow(orphan_nodes)))

duplicate_node_ids <- data$nodes %>% filter(duplicated(id))
print(paste("Duplicate node IDs:", nrow(duplicate_node_ids)))

duplicate_links <- data$links %>% filter(duplicated(paste(source, target, `Edge Type`)))
print(paste("Duplicate linking nodes:", nrow(duplicate_links)))

sailor_node <- data$nodes %>%
  filter(name == "Sailor Shift" | stage_name == "Sailor Shift")
print("Sailor Shift's Node:")
print(sailor_node)

#removing erroneous data
links <- data$links
links <- links %>% filter(source != target) #removing self pointing node
links <- links %>% distinct(source, target, `Edge Type`, .keep_all = TRUE)
#######################################
#1b data:

creation_types <- c("PerformerOf", "ComposerOf", "LyricistOf", "ProducerOf", "MemberOf")
influence_types <- c("InterpolatesFrom", "DirectlySamples", "InStyleOf", "CoverOf", "LyricalReferenceTo")
sailor_music_links <- links %>% filter(source == 17255 & `Edge Type` %in% creation_types)
her_music_ids <- sailor_music_links$target

collab_music_links <- links %>% filter(target %in% her_music_ids & source != 17255 & `Edge Type` %in% creation_types)
direct_influence_links <- links %>% filter(target %in% c(17255, her_music_ids) & `Edge Type` %in% influence_types)

direct_sources <- direct_influence_links$source

direct_creator_links <- links %>% filter(target %in% direct_sources & `Edge Type` %in% creation_types)
all_direct_entities <- unique(c(direct_sources, direct_creator_links$source))
direct_artists_discography_links <- links %>% filter(source %in% all_direct_entities & `Edge Type` %in% creation_types)

direct_discography_ids <- direct_artists_discography_links$target



indirect_influence_links <- links %>% filter(target %in% c(all_direct_entities, direct_discography_ids) & `Edge Type` %in% influence_types)

indirect_sources <- indirect_influence_links$source



indirect_creator_links <- links %>%
  filter(target %in% indirect_sources & `Edge Type` %in% creation_types)
q1b_links <- bind_rows(
  sailor_music_links,
  collab_music_links,
  direct_influence_links,
  direct_creator_links,
  direct_artists_discography_links, 
  indirect_influence_links,
  indirect_creator_links) %>% distinct()



all_1b_ids <- unique(c(17255, q1b_links$source, q1b_links$target))
q1b_nodes <- data$nodes %>% filter(id %in% all_1b_ids)

network_1b <- list(nodes = q1b_nodes, links = q1b_links)

write_json(network_1b, "q1b_collab_network.json", pretty = TRUE)
#############################################

#1a data:
creation_types <- c("PerformerOf", "ComposerOf", "LyricistOf", "ProducerOf")

sailor_music_links <- links %>% filter(source == 17255 & `Edge Type` %in% creation_types)

her_project_ids <- sailor_music_links$target
influence_link_types <- c("InterpolatesFrom", "DirectlySamples", "InStyleOf", "CoverOf", "LyricalReferenceTo")

her_influence_links <- links %>% filter(source %in% her_project_ids & `Edge Type` %in% influence_link_types)

influential_project_ids <- her_influence_links$target

influencer_creator_links <- links %>% filter(target %in% influential_project_ids & `Edge Type` %in% creation_types)
q1a_links <- bind_rows(sailor_music_links, her_influence_links, influencer_creator_links)
q1a_nodes <- data$nodes %>% filter(id %in% c(17255, her_project_ids, influential_project_ids, influencer_creator_links$source))

network_1a <- list(nodes = q1a_nodes, links = q1a_links)
write_json(network_1a, "q1a_influence_network.json", pretty = TRUE)


##############################################

#1c data:
oceanus_projects <- data$nodes %>% filter(genre == "Oceanus Folk") %>% pull(id)

project_links <- links %>% filter(source %in% oceanus_projects | target %in% oceanus_projects)
oceanus_entities <- unique(c(project_links$source, project_links$target))

oceanus_links <- links %>% filter((source %in% oceanus_projects | target %in% oceanus_projects) | (source %in% oceanus_entities & target %in% oceanus_entities & `Edge Type` == "MemberOf"))

q1c_nodes <- data$nodes %>% filter(id %in% c(oceanus_links$source, oceanus_links$target))

network_1c <- list(nodes = q1c_nodes, links = oceanus_links)
write_json(network_1c, "q1c_oceanus_community.json", pretty = TRUE)
